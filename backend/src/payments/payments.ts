import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, MinLength } from 'class-validator';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { type AuthUser, CurrentUser, JwtAuthGuard } from '../auth/auth.js';
import { OrdersModule, OrdersService } from '../orders/orders.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EsimProvider } from '../provider/esim-provider.js';

export class StripeCheckoutDto {
  @IsString() orderId: string;
}
export class MpesaStkDto {
  @IsString() orderId: string;
  /** Safaricom number, e.g. 0712345678 / 254712345678 / +254712345678 */
  @IsString() @MinLength(9) phone: string;
}

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  /** mock: payments auto-succeed after a short delay (local dev/demo). live: real Stripe/Daraja. */
  private readonly mock: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly provider: EsimProvider,
    private readonly config: ConfigService,
  ) {
    this.mock = config.get('PAYMENTS_MODE', 'mock') !== 'live';
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
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

  // ---- Stripe ----------------------------------------------------------------------------

  async stripeCheckout(userId: string, orderId: string) {
    const order = await this.payableOrder(userId, orderId);
    const payment = await this.prisma.payment.create({
      data: { orderId, provider: 'STRIPE', amountCents: order.pricePaidCents },
    });
    if (this.mock || !this.stripe) {
      if (!this.mock) throw new BadRequestException('Stripe is not configured');
      this.autoSucceed(payment.id, orderId, 2500);
      return { mock: true, url: null };
    }
    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: order.package.currency.toLowerCase(),
          unit_amount: order.pricePaidCents,
          product_data: { name: order.package.name },
        },
      }],
      metadata: { orderId, paymentId: payment.id },
      // Web uses hash routing, so the same URL works for the web build; mobile deep-link is a follow-up.
      success_url: `${appUrl}/#/orders/${orderId}`,
      cancel_url: `${appUrl}/#/checkout/${orderId}`,
    });
    await this.prisma.payment.update({ where: { id: payment.id }, data: { externalRef: session.id } });
    return { mock: false, url: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.stripe || !rawBody || !signature) throw new BadRequestException();
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'));
    } catch {
      throw new BadRequestException('Bad signature');
    }
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === 'paid' && s.metadata?.paymentId && s.metadata.orderId) {
        const intent = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
        await this.succeed(s.metadata.paymentId, s.metadata.orderId, intent ?? undefined);
      }
    }
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
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
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

  // ---- Refunds (admin) -----------------------------------------------------------------------

  async refund(orderId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { orderId, status: 'SUCCEEDED' } });
    if (!payment) throw new BadRequestException('No successful payment to refund');
    let refundRef: string;
    if (payment.provider === 'STRIPE' && !this.mock && this.stripe && payment.intentRef) {
      refundRef = (await this.stripe.refunds.create({ payment_intent: payment.intentRef })).id;
    } else if (payment.provider === 'MPESA' && !this.mock) {
      // Daraja reversals need extra credentials; flag for a manual reversal in the M-Pesa portal.
      refundRef = 'manual-mpesa-reversal-required';
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

  @Post('payments/stripe/checkout') @UseGuards(JwtAuthGuard)
  stripe(@CurrentUser() u: AuthUser, @Body() dto: StripeCheckoutDto) {
    return this.payments.stripeCheckout(u.sub, dto.orderId);
  }

  @Post('payments/mpesa/stk') @UseGuards(JwtAuthGuard) @HttpCode(200)
  mpesa(@CurrentUser() u: AuthUser, @Body() dto: MpesaStkDto) {
    return this.payments.mpesaStk(u.sub, dto.orderId, dto.phone);
  }

  @Post('webhooks/stripe') @HttpCode(200)
  async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig?: string) {
    await this.payments.handleStripeWebhook(req.rawBody, sig);
    return { received: true };
  }

  @Post('webhooks/mpesa/:secret') @HttpCode(200)
  async mpesaCallback(@Param('secret') secret: string, @Body() body: unknown) {
    await this.payments.handleMpesaCallback(secret, body);
    // Daraja expects this acknowledgement shape.
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
