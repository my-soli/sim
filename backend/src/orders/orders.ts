import {
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import { type AuthUser, CurrentUser, JwtAuthGuard } from '../auth/auth.js';
import { NotificationsService } from '../notifications/notifications.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EsimProvider } from '../provider/esim-provider.js';
import type { Esim, PackageCache } from '../generated/prisma/client.js';

const POLL_EVERY_MS = 2500;
const POLL_FOR_MS = 90_000;
const GIVE_UP_AFTER_MS = 30 * 60_000;

export class CreateOrderDto {
  @IsString() packageId: string;
}

export const toEsimView = (e: Esim, pkg: PackageCache) => ({
  id: e.id,
  orderId: e.orderId,
  iccid: e.iccid,
  smdpAddress: e.smdpAddress,
  activationCode: e.activationCode,
  // Standard LPA string; encoded as the QR on the client so nothing depends on a provider-hosted image.
  lpaString: e.smdpAddress && e.activationCode ? `LPA:1$${e.smdpAddress}$${e.activationCode}` : null,
  qrUrl: e.qrUrl,
  status: e.status,
  dataUsedBytes: Number(e.dataUsedBytes),
  dataTotalBytes: Number(e.dataTotalBytes),
  expiresAt: e.expiresAt,
  country: pkg.country,
  countryName: pkg.countryName,
  planName: pkg.name,
  validityDays: pkg.validityDays,
});

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);
  private readonly polling = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: EsimProvider,
    private readonly notify: NotificationsService,
  ) {}

  async create(userId: string, packageId: string) {
    const pkg = await this.prisma.packageCache.findFirst({ where: { id: packageId, active: true } });
    if (!pkg) throw new NotFoundException('Plan not available');
    const order = await this.prisma.order.create({
      // Prices are snapshotted so later catalog syncs can't change what the customer agreed to pay.
      data: { userId, packageRefId: pkg.id, pricePaidCents: pkg.retailCents, wholesaleCostCents: pkg.wholesaleCents },
    });
    return this.view(order.id, userId);
  }

  async view(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...(userId ? { userId } : {}) },
      include: { package: true, esim: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      id: order.id,
      status: order.status,
      priceCents: order.pricePaidCents,
      currency: order.package.currency,
      failureReason: order.status === 'FAILED' ? order.failureReason : null,
      createdAt: order.createdAt,
      package: {
        id: order.package.id, name: order.package.name, country: order.package.country,
        countryName: order.package.countryName, dataBytes: Number(order.package.dataBytes),
        validityDays: order.package.validityDays,
      },
      esim: order.esim ? toEsimView(order.esim, order.package) : null,
    };
  }

  list(userId: string) {
    return this.prisma.order
      .findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true } })
      .then((rows) => Promise.all(rows.map((r) => this.view(r.id, userId))));
  }

  /** Called once a payment (Stripe or M-Pesa) is confirmed. Idempotent. */
  async onPaymentSucceeded(orderId: string) {
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PENDING_PAYMENT' },
      data: { status: 'PAID' },
    });
    if (count === 1) void this.fulfil(orderId);
  }

  private async fulfil(orderId: string) {
    // Claim the order so concurrent webhooks/retries can't provision twice.
    const claim = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PAID' },
      data: { status: 'PROVISIONING' },
    });
    if (claim.count !== 1) return;
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { package: true } });
    try {
      const { orderNo } = await this.provider.createOrder({
        packageId: order.package.packageId,
        transactionId: order.id,
        wholesaleCents: order.wholesaleCostCents,
      });
      await this.prisma.$transaction([
        this.prisma.order.update({ where: { id: order.id }, data: { providerOrderNo: orderNo } }),
        this.prisma.walletTxn.create({
          data: { userId: order.userId, type: 'PROVIDER_DEBIT', amountCents: -order.wholesaleCostCents, providerRef: orderNo },
        }),
      ]);
      void this.pollUntilReady(order.id);
    } catch (e) {
      const reason = (e as Error).message;
      this.log.error(`Provisioning ${order.id} failed: ${reason}`);
      await this.prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED', failureReason: reason } });
    }
  }

  /** Fast path for the first minute or so; the @Interval reconciler below is the safety net. */
  private async pollUntilReady(orderId: string) {
    if (this.polling.has(orderId)) return;
    this.polling.add(orderId);
    try {
      const until = Date.now() + POLL_FOR_MS;
      while (Date.now() < until) {
        if (await this.tryComplete(orderId)) return;
        await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
      }
    } finally {
      this.polling.delete(orderId);
    }
  }

  /** Fetches the profile from the provider and finalises the order. Returns true when done. */
  async tryComplete(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { package: true, user: true },
    });
    if (!order?.providerOrderNo) return false;
    if (order.status === 'READY') return true;
    if (order.status !== 'PROVISIONING') return false;
    try {
      const profile = await this.provider.getProfile(order.providerOrderNo);
      if (!profile) return false;
      await this.prisma.$transaction([
        this.prisma.esim.upsert({
          where: { orderId },
          update: {},
          create: {
            orderId, iccid: profile.iccid, esimTranNo: profile.esimTranNo, qrUrl: profile.qrUrl,
            smdpAddress: profile.smdpAddress, activationCode: profile.activationCode,
            status: profile.activated ? 'ACTIVE' : 'INACTIVE',
            dataUsedBytes: BigInt(profile.usedBytes), dataTotalBytes: BigInt(profile.totalBytes),
            expiresAt: profile.expiresAt,
          },
        }),
        this.prisma.order.update({ where: { id: orderId }, data: { status: 'READY' } }),
      ]);
      await this.notify.email(
        order.user.email,
        `Your ${order.package.countryName} eSIM is ready`,
        `Your eSIM for ${order.package.name} is ready to install.\n\nSM-DP+ address: ${profile.smdpAddress}\nActivation code: ${profile.activationCode}\n\nOpen the app for the QR code and install steps.`,
      );
      return true;
    } catch (e) {
      this.log.warn(`Profile fetch for ${orderId} failed: ${(e as Error).message}`);
      return false;
    }
  }

  @Interval(60_000)
  async reconcile() {
    const stuck = await this.prisma.order.findMany({
      where: { status: 'PROVISIONING', updatedAt: { lt: new Date(Date.now() - POLL_FOR_MS) } },
      take: 50,
    });
    for (const o of stuck) {
      if (await this.tryComplete(o.id)) continue;
      if (Date.now() - o.updatedAt.getTime() > GIVE_UP_AFTER_MS) {
        await this.prisma.order.update({
          where: { id: o.id },
          data: { status: 'FAILED', failureReason: 'Provider did not deliver the profile in time' },
        });
      }
    }
  }

  /** Provider webhook entrypoint (deduped on the provider's event id). */
  async handleProviderWebhook(headers: Record<string, unknown>, body: unknown) {
    const event = this.provider.parseWebhook(headers, body);
    if (!event) return;
    try {
      await this.prisma.providerWebhookEvent.create({ data: { notifyId: event.eventId, notifyType: event.type } });
    } catch {
      return; // duplicate delivery
    }
    if (event.type === 'ORDER_READY' && event.orderNo) {
      const order = await this.prisma.order.findFirst({ where: { providerOrderNo: event.orderNo } });
      if (order) await this.tryComplete(order.id);
    }
  }
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(u.sub, dto.packageId);
  }

  @Get() list(@CurrentUser() u: AuthUser) { return this.orders.list(u.sub); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.orders.view(id, u.sub); }
}

@Controller('webhooks/provider')
export class ProviderWebhookController {
  constructor(private readonly orders: OrdersService) {}

  @Post() @HttpCode(200)
  async receive(@Req() req: Request, @Body() body: unknown) {
    await this.orders.handleProviderWebhook(req.headers as Record<string, unknown>, body);
    return { ok: true };
  }
}

@Module({
  controllers: [OrdersController, ProviderWebhookController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
