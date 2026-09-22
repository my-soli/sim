import { Controller, Get, Injectable, Logger, Module, NotFoundException, OnApplicationBootstrap, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { EsimProvider } from '../provider/esim-provider.js';
import { PrismaService } from '../prisma/prisma.service.js';

const POPULAR = ['US', 'GB', 'JP', 'TH', 'FR', 'IT', 'ES', 'AE', 'TR', 'KE', 'ZA', 'TZ'];

@Injectable()
export class CatalogService implements OnApplicationBootstrap {
  private readonly log = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: EsimProvider,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    // Per-provider count: switching PROVIDER (mock -> esimaccess) has 0 rows for the new provider,
    // so this fires a fresh sync automatically instead of leaving the storefront empty until a manual sync.
    if ((await this.prisma.packageCache.count({ where: { providerId: this.provider.id } })) === 0) {
      await this.sync().catch((e) => this.log.error(`Initial sync failed: ${e.message}`));
    }
  }

  @Cron('0 3 * * *')
  async sync() {
    const markup = Number(this.config.get('MARKUP_PERCENT', '40'));
    const pkgs = await this.provider.listPackages();
    const syncedAt = new Date();
    for (const p of pkgs) {
      const retailCents = Math.ceil(p.wholesaleCents * (1 + markup / 100));
      const data = {
        name: p.name, country: p.country, countryName: p.countryName, isRegional: p.isRegional,
        dataBytes: BigInt(p.dataBytes), validityDays: p.validityDays, wholesaleCents: p.wholesaleCents,
        retailCents, currency: p.currency, smsStatus: p.smsStatus, active: true, syncedAt,
      };
      await this.prisma.packageCache.upsert({
        where: { providerId_packageId: { providerId: this.provider.id, packageId: p.packageId } },
        update: data,
        create: { providerId: this.provider.id, packageId: p.packageId, ...data },
      });
    }
    // Anything the provider stopped listing must not be sellable.
    const { count } = await this.prisma.packageCache.updateMany({
      where: { providerId: this.provider.id, syncedAt: { lt: syncedAt } },
      data: { active: false },
    });
    // Only one provider is ever "live" in this MVP (see EsimProvider / PROVIDER env var). If PROVIDER was switched
    // (e.g. mock -> esimaccess), retire the old provider's catalog so its packages can't still be bought - ordering
    // one against the newly-live provider would fail, since that provider never issued that packageId.
    const { count: retired } = await this.prisma.packageCache.updateMany({
      where: { providerId: { not: this.provider.id }, active: true },
      data: { active: false },
    });
    if (retired > 0) this.log.warn(`Retired ${retired} packages from a previous PROVIDER after switching to "${this.provider.id}"`);
    this.log.log(`Synced ${pkgs.length} packages (${count} deactivated) at ${markup}% markup`);
    return { synced: pkgs.length, deactivated: count, retiredFromOtherProviders: retired };
  }

  async countries() {
    const rows = await this.prisma.packageCache.groupBy({
      by: ['country', 'countryName', 'isRegional'],
      where: { active: true, providerId: this.provider.id },
      _min: { retailCents: true },
      _count: { _all: true },
    });
    return rows
      .map((r) => ({
        code: r.country, name: r.countryName, isRegional: r.isRegional,
        popular: !r.isRegional && POPULAR.includes(r.country),
        fromPriceCents: r._min.retailCents ?? 0, planCount: r._count._all,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async packages(code: string) {
    const rows = await this.prisma.packageCache.findMany({
      where: { country: code.toUpperCase(), active: true, providerId: this.provider.id },
      orderBy: [{ validityDays: 'asc' }, { retailCents: 'asc' }],
    });
    if (!rows.length) throw new NotFoundException('No plans for this destination');
    return rows.map((p) => ({
      id: p.id, name: p.name, country: p.country, countryName: p.countryName,
      dataBytes: Number(p.dataBytes), validityDays: p.validityDays,
      priceCents: p.retailCents, currency: p.currency, smsStatus: p.smsStatus,
    }));
  }
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('countries') countries() { return this.catalog.countries(); }
  @Get('countries/:code/packages') packages(@Param('code') code: string) { return this.catalog.packages(code); }
}

@Module({ controllers: [CatalogController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
