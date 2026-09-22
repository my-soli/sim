import { Controller, Get, Injectable, Logger, Module, UseGuards } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { type AuthUser, CurrentUser, JwtAuthGuard } from '../auth/auth.js';
import { NotificationsService } from '../notifications/notifications.js';
import { toEsimView } from '../orders/orders.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EsimProvider } from '../provider/esim-provider.js';

const LOW_DATA_FRACTION = 0.2;
const EXPIRY_WARNING_MS = 48 * 3600_000;

@Injectable()
export class EsimsService {
  private readonly log = new Logger(EsimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: EsimProvider,
    private readonly notify: NotificationsService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.esim.findMany({
      where: { order: { userId } },
      include: { order: { include: { package: true } } },
      orderBy: { order: { createdAt: 'desc' } },
    });
    const now = Date.now();
    return rows.map((e) => {
      const view = toEsimView(e, e.order.package);
      const expired = e.status === 'EXPIRED' || (e.expiresAt && e.expiresAt.getTime() < now);
      return { ...view, status: expired && e.status !== 'CANCELLED' ? 'EXPIRED' : e.status };
    });
  }

  /**
   * Provider usage is only refreshed every 2-3h upstream, so a 30 min poll is plenty.
   * Also the fallback for low-data/expiry alerts when provider usage webhooks aren't relied on.
   */
  @Interval(30 * 60_000)
  async refreshUsage() {
    const esims = await this.prisma.esim.findMany({
      where: { status: { in: ['ACTIVE', 'INACTIVE'] }, esimTranNo: { not: null } },
      include: { order: { include: { user: true, package: true } } },
    });
    if (!esims.length) return;
    const usage = await this.provider.getUsage(esims.map((e) => e.esimTranNo!));
    const byNo = new Map(usage.map((u) => [u.esimTranNo, u]));
    for (const e of esims) {
      const u = byNo.get(e.esimTranNo!);
      const total = u?.totalBytes || Number(e.dataTotalBytes);
      const used = u?.usedBytes ?? Number(e.dataUsedBytes);
      const expired = !!e.expiresAt && e.expiresAt.getTime() < Date.now();
      const lowData = total > 0 && (total - used) / total <= LOW_DATA_FRACTION;
      const expiringSoon = !!e.expiresAt && !expired && e.expiresAt.getTime() - Date.now() < EXPIRY_WARNING_MS;
      const to = e.order.user.email;
      const label = e.order.package.name;

      if (lowData && !e.lowDataNotified) {
        await this.notify.email(to, `Low data on your ${e.order.package.countryName} eSIM`,
          `Your ${label} eSIM has less than 20% data left. Open the app to top up.`);
      }
      if ((expiringSoon || expired) && !e.expiryNotified) {
        await this.notify.email(to, expired ? `Your ${e.order.package.countryName} eSIM has expired` : `Your ${e.order.package.countryName} eSIM expires soon`,
          expired ? `Your ${label} eSIM has expired.` : `Your ${label} eSIM expires within 48 hours.`);
      }
      await this.prisma.esim.update({
        where: { id: e.id },
        data: {
          dataUsedBytes: BigInt(used), dataTotalBytes: BigInt(total),
          status: expired ? 'EXPIRED' : e.status,
          lowDataNotified: e.lowDataNotified || lowData,
          expiryNotified: e.expiryNotified || expiringSoon || expired,
        },
      });
    }
    this.log.log(`Refreshed usage for ${esims.length} eSIMs`);
  }
}

@Controller('esims')
@UseGuards(JwtAuthGuard)
export class EsimsController {
  constructor(private readonly esims: EsimsService) {}
  @Get() list(@CurrentUser() u: AuthUser) { return this.esims.list(u.sub); }
}

@Module({ controllers: [EsimsController], providers: [EsimsService] })
export class EsimsModule {}
