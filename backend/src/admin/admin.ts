import { Controller, Get, Injectable, Logger, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AdminGuard } from '../auth/auth.js';
import { CatalogModule, CatalogService } from '../catalog/catalog.js';
import { NotificationsService } from '../notifications/notifications.js';
import { PaymentsModule, PaymentsService } from '../payments/payments.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EsimProvider } from '../provider/esim-provider.js';

@Injectable()
export class AdminService {
  private readonly log = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: EsimProvider,
    private readonly payments: PaymentsService,
    private readonly catalog: CatalogService,
    private readonly notify: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async orders(status?: string, take = 50, skip = 0) {
    const rows = await this.prisma.order.findMany({
      where: status ? { status: status as never } : {},
      include: { user: true, package: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      skip,
    });
    return rows.map((o) => ({
      id: o.id, status: o.status, createdAt: o.createdAt, user: o.user.email ?? o.user.phone,
      plan: o.package.name, providerOrderNo: o.providerOrderNo, failureReason: o.failureReason,
      pricePaidCents: o.pricePaidCents, wholesaleCostCents: o.wholesaleCostCents,
      marginCents: o.pricePaidCents - o.wholesaleCostCents,
      marginPercent: o.pricePaidCents ? Math.round(((o.pricePaidCents - o.wholesaleCostCents) / o.pricePaidCents) * 1000) / 10 : 0,
    }));
  }

  /** Margin only counts orders that were actually paid and not refunded. */
  async margin() {
    const rows = await this.prisma.order.findMany({
      where: { status: { in: ['PAID', 'PROVISIONING', 'READY'] } },
      select: { pricePaidCents: true, wholesaleCostCents: true },
    });
    const revenue = rows.reduce((s, r) => s + r.pricePaidCents, 0);
    const cost = rows.reduce((s, r) => s + r.wholesaleCostCents, 0);
    return { orders: rows.length, revenueCents: revenue, wholesaleCostCents: cost, marginCents: revenue - cost,
      marginPercent: revenue ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0 };
  }

  async wallet() {
    const [balanceCents, txns] = await Promise.all([
      this.provider.getBalanceCents(),
      this.prisma.walletTxn.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return { provider: this.provider.id, balanceCents, txns };
  }

  @Cron('0 * * * *')
  async checkFloat() {
    const min = Number(this.config.get('LOW_BALANCE_CENTS', '5000'));
    const balance = await this.provider.getBalanceCents().catch(() => null);
    if (balance !== null && balance < min) {
      this.log.warn(`Provider balance low: ${balance}c`);
      for (const to of this.config.get<string>('ADMIN_EMAILS', '').split(',').filter(Boolean)) {
        await this.notify.email(to.trim(), 'Provider balance is low', `Prepaid balance is ${(balance / 100).toFixed(2)}. Orders will fail when it hits zero.`);
      }
    }
  }

  refund(orderId: string) { return this.payments.refund(orderId); }
  resync() { return this.catalog.sync(); }
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('orders') orders(@Query('status') status?: string, @Query('take') take?: string, @Query('skip') skip?: string) {
    return this.admin.orders(status, Number(take) || 50, Number(skip) || 0);
  }
  @Get('margin') margin() { return this.admin.margin(); }
  @Get('wallet') wallet() { return this.admin.wallet(); }
  @Post('orders/:id/refund') refund(@Param('id') id: string) { return this.admin.refund(id); }
  @Post('catalog/sync') sync() { return this.admin.resync(); }
}

@Module({ imports: [PaymentsModule, CatalogModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
