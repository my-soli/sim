import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, MinLength } from 'class-validator';
import { type AuthUser, CurrentUser, JwtAuthGuard } from '../auth/auth.js';
import { OrdersModule, OrdersService } from '../orders/orders.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EsimProvider } from '../provider/esim-provider.js';

export class MpesaStkDto {
  @IsString() orderId: string;
  /** Safaricom number, e.g. 0712345678 / 254712345678 / +254712345678 */
  @IsString() @MinLength(9) phone: string;
}
export class PesapalCheckoutDto {
  @IsString() orderId: string;
}

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  /** mock: payments auto-succeed after a short delay (local dev/demo). live: real Daraja/Pesapal. */
  private readonly mock: boolean;
  /** Cached per server lifetime - avoids a round trip + re-registering the IPN on every checkout. */
  private pesapalTokenCache: { value: string; expiresAt: number } | null = null;
  private pesapalIpnId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly provider: EsimProvider,
    private readonly config: ConfigService,
  ) {
    this.mock = config.get('PAYMENTS_MODE', 'mock') !== 'live';
  }

  private async payableOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: { package: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('Order is not awaiting payment');
    return order;
  }

  private autoSucceed(paymentId: string, orderId: string, delayMs: number) {
    setTimeout(() => void this.succeed(paymentId, orderId).catch((e) => this.log.error(e)), delayMs);
  }

  private async succeed(paymentId: string, orderId: string, intentRef?: string) {
    const { count } = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'SUCCEEDED', ...(intentRef ? { intentRef } : {}) },
    });
    if (count === 1) await this.orders.onPaymentSucceeded(orderId);
  }

  // ---- M-Pesa (Daraja STK push) ------------------------------------------------------------

  private msisdn(raw: string) {
    const d = raw.replace(/[^\d]/g, '');
    const n = d.startsWith('0') ? '254' + d.slice(1) : d.startsWith('7') || d.startsWith('1') ? '254' + d : d;
    if (!/^254[17]\d{8}$/.test(n)) throw new BadRequestException('Enter a valid Kenyan M-Pesa number');
    return n;
  }

  private async darajaToken(base: string) {
    const auth = Buffer.from(
      `${this.config.getOrThrow('MPESA_CONSUMER_KEY')}:${this.config.getOrThrow('MPESA_CONSUMER_SECRET')}`,
    ).toString('base64');
    const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new BadRequestException('M-Pesa authentication failed');
    return ((await res.json()) as { access_token: string }).access_token;
  }

  /**
   * Customer approves the PIN prompt on their phone, independent of the device they're browsing on.
   * The client just polls the order; only the Daraja callback (below) confirms payment.
   */
  async mpesaStk(userId: string, orderId: string, phone: string) {
    const order = await this.payableOrder(userId, orderId);
    const msisdn = this.msisdn(phone);
    const rate = Number(this.config.get('KES_PER_USD', '129'));
    const amountKes = Math.ceil((order.pricePaidCents / 100) * rate);
    const payment = await this.prisma.payment.create({
      data: { orderId, provider: 'MPESA', amountCents: order.pricePaidCents },
    });
    if (this.mock) {
      this.autoSucceed(payment.id, orderId, 4000);
      return { mock: true, amountKes };
    }
    const base = this.config.get('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke');
    const shortcode = this.config.getOrThrow<string>('MPESA_SHORTCODE');
    // Daraja requires the Timestamp (and the password derived from it) in East Africa Time
    // (UTC+3, no DST), not server-local or raw UTC - our host runs in UTC, so this must be shifted
    // explicitly or every request silently fails timestamp validation.
    const eat = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const ts = eat.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${this.config.getOrThrow('MPESA_PASSKEY')}${ts}`).toString('base64');
    const token = await this.darajaToken(base);
    const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode, Password: password, Timestamp: ts,
        TransactionType: 'CustomerPayBillOnline', Amount: amountKes, PartyA: msisdn, PartyB: shortcode,
        PhoneNumber: msisdn,
        CallBackURL: `${this.config.getOrThrow('PUBLIC_API_URL')}/webhooks/mpesa/${this.config.getOrThrow('MPESA_CALLBACK_SECRET')}`,
        AccountReference: order.id.slice(0, 12), TransactionDesc: 'eSIM',
      }),
    });
    const json = (await res.json()) as { ResponseCode?: string; CheckoutRequestID?: string; errorMessage?: string };
    if (json.ResponseCode !== '0' || !json.CheckoutRequestID) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw new BadRequestException(json.errorMessage ?? 'Could not start M-Pesa payment');
    }
    await this.prisma.payment.update({ where: { id: payment.id }, data: { externalRef: json.CheckoutRequestID } });
    return { mock: false, amountKes };
  }

  async handleMpesaCallback(secret: string, body: any) {
    if (secret !== this.config.get('MPESA_CALLBACK_SECRET')) throw new NotFoundException();
    const cb = body?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) return;
    const payment = await this.prisma.payment.findFirst({
      where: { provider: 'MPESA', externalRef: cb.CheckoutRequestID },
    });
    if (!payment) return;
    if (cb.ResultCode === 0) {
      await this.succeed(payment.id, payment.orderId);
    } else {
      await this.prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    }
  }

  // ---- Pesapal (card payments) ----------------------------------------------------------------

  private pesapalBase() {
    return this.config.get('PESAPAL_BASE_URL', 'https://cybqa.pesapal.com/pesapalv3');
  }

  private async pesapalAuthToken() {
    if (this.pesapalTokenCache && this.pesapalTokenCache.expiresAt > Date.now()) return this.pesapalTokenCache.value;
    const res = await fetch(`${this.pesapalBase()}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consumer_key: this.config.getOrThrow('PESAPAL_CONSUMER_KEY'),
        consumer_secret: this.config.getOrThrow('PESAPAL_CONSUMER_SECRET'),
      }),
    });
    const json = (await res.json()) as { token?: string; error?: unknown; message?: string };
    if (!res.ok || !json.token) throw new BadRequestException(json.message ?? 'Pesapal authentication failed');
    // Tokens are valid 5 minutes; refresh a little early to avoid using one that expires mid-request.
    this.pesapalTokenCache = { value: json.token, expiresAt: Date.now() + 4 * 60 * 1000 };
    return json.token;
  }

  private async pesapalIpn(token: string) {
    if (this.pesapalIpnId) return this.pesapalIpnId;
    const res = await fetch(`${this.pesapalBase()}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${this.config.getOrThrow('PUBLIC_API_URL')}/webhooks/pesapal`,
        ipn_notification_type: 'GET',
      }),
    });
    const json = (await res.json()) as { ipn_id?: string; message?: string };
    if (!res.ok || !json.ipn_id) throw new BadRequestException(json.message ?? 'Pesapal IPN registration failed');
    this.pesapalIpnId = json.ipn_id;
    return json.ipn_id;
  }

  async pesapalCheckout(userId: string, orderId: string) {
    const order = await this.payableOrder(userId, orderId);
    const payment = await this.prisma.payment.create({
      data: { orderId, provider: 'PESAPAL', amountCents: order.pricePaidCents },
    });
    if (this.mock) {
      this.autoSucceed(payment.id, orderId, 3000);
      return { mock: true, url: null };
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const rate = Number(this.config.get('KES_PER_USD', '129'));
    const amountKes = Math.ceil((order.pricePaidCents / 100) * rate);
    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const token = await this.pesapalAuthToken();
    const notificationId = await this.pesapalIpn(token);
    const res = await fetch(`${this.pesapalBase()}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: payment.id,
        currency: 'KES',
        amount: amountKes,
        description: order.package.name.slice(0, 100),
        callback_url: `${appUrl}/checkout/${orderId}`,
        cancellation_url: `${appUrl}/checkout/${orderId}`,
        notification_id: notificationId,
        billing_address: user.email ? { email_address: user.email } : { phone_number: user.phone! },
      }),
    });
    const json = (await res.json()) as { order_tracking_id?: string; redirect_url?: string; message?: string };
    if (!res.ok || !json.order_tracking_id || !json.redirect_url) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw new BadRequestException(json.message ?? 'Could not start card payment');
    }
    await this.prisma.payment.update({ where: { id: payment.id }, data: { externalRef: json.order_tracking_id } });
    return { mock: false, url: json.redirect_url };
  }

  /**
   * The IPN call's own payload isn't authoritative (and its exact shape is thinly documented) - it's
   * only a nudge to re-check. GetTransactionStatus is the source of truth for whether payment succeeded.
   */
  async handlePesapalCallback(orderTrackingId: string | undefined) {
    if (!orderTrackingId) return;
    const payment = await this.prisma.payment.findFirst({ where: { provider: 'PESAPAL', externalRef: orderTrackingId } });
    if (!payment) return;
    const token = await this.pesapalAuthToken();
    const res = await fetch(
      `${this.pesapalBase()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );
    const json = (await res.json()) as { status_code?: number; confirmation_code?: string };
    if (json.status_code === 1) {
      await this.succeed(payment.id, payment.orderId, json.confirmation_code);
    } else if (json.status_code === 2 || json.status_code === 0) {
      await this.prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    }
  }

  // ---- Refunds (admin) -----------------------------------------------------------------------

  async refund(orderId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { orderId, status: 'SUCCEEDED' } });
    if (!payment) throw new BadRequestException('No successful payment to refund');
    let refundRef: string;
    if (payment.provider === 'MPESA' && !this.mock) {
      // Daraja reversals need extra credentials; flag for a manual reversal in the M-Pesa portal.
      refundRef = 'manual-mpesa-reversal-required';
    } else if (payment.provider === 'PESAPAL' && !this.mock) {
      // Pesapal refunds go through their RefundRequest endpoint, which needs manual review on their
      // side before it's actioned - flag for a manual reversal in the Pesapal merchant portal for now.
      refundRef = 'manual-pesapal-reversal-required';
    } else {
      refundRef = `mock-refund-${Date.now()}`;
    }
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { esim: true } });
    // Best effort: release the eSIM at the provider so the wholesale cost is recovered when possible.
    if (order.esim?.esimTranNo && order.esim.dataUsedBytes === 0n) {
      await this.provider.cancel(order.esim.esimTranNo).catch((e) => this.log.warn(`Provider cancel failed: ${e.message}`));
    }
    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundRef } }),
      this.prisma.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } }),
      ...(order.esim ? [this.prisma.esim.update({ where: { id: order.esim.id }, data: { status: 'CANCELLED' } })] : []),
    ]);
    return { refunded: true, refundRef, manual: refundRef.startsWith('manual') };
  }
}

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments/mpesa/stk') @UseGuards(JwtAuthGuard) @HttpCode(200)
  mpesa(@CurrentUser() u: AuthUser, @Body() dto: MpesaStkDto) {
    return this.payments.mpesaStk(u.sub, dto.orderId, dto.phone);
  }

  @Post('webhooks/mpesa/:secret') @HttpCode(200)
  async mpesaCallback(@Param('secret') secret: string, @Body() body: unknown) {
    await this.payments.handleMpesaCallback(secret, body);
    // Daraja expects this acknowledgement shape.
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  @Post('payments/pesapal/checkout') @UseGuards(JwtAuthGuard)
  pesapal(@CurrentUser() u: AuthUser, @Body() dto: PesapalCheckoutDto) {
    return this.payments.pesapalCheckout(u.sub, dto.orderId);
  }

  // Registered with Pesapal as a GET IPN - see pesapalIpn() in the service.
  @Get('webhooks/pesapal')
  async pesapalCallback(@Query('OrderTrackingId') orderTrackingId?: string) {
    await this.payments.handlePesapalCallback(orderTrackingId);
    return { status: '200' };
  }
}

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
