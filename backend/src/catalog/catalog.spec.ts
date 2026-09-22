import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EsimProvider, ProviderPackage } from '../provider/esim-provider.js';
import { CatalogService } from './catalog.js';

// In-memory stand-in for the packagesCache table, covering only the query shapes CatalogService uses.
function fakePrisma(seed: any[] = []) {
  const rows = [...seed];
  let seq = rows.length;
  const matches = (r: any, where: any = {}) => {
    if (where.providerId && typeof where.providerId === 'string' && r.providerId !== where.providerId) return false;
    if (where.providerId?.not && r.providerId === where.providerId.not) return false;
    if (where.active !== undefined && r.active !== where.active) return false;
    if (where.country && r.country !== where.country) return false;
    if (where.syncedAt?.lt && !(r.syncedAt < where.syncedAt.lt)) return false;
    return true;
  };
  return {
    _rows: rows,
    packageCache: {
      count: async ({ where }: any = {}) => rows.filter((r) => matches(r, where)).length,
      upsert: async ({ where, update, create }: any) => {
        const existing = rows.find((r) => r.providerId === where.providerId_packageId.providerId && r.packageId === where.providerId_packageId.packageId);
        if (existing) Object.assign(existing, update);
        else rows.push({ id: `pkg-${++seq}`, ...create });
      },
      updateMany: async ({ where, data }: any) => {
        const targets = rows.filter((r) => matches(r, where));
        targets.forEach((r) => Object.assign(r, data));
        return { count: targets.length };
      },
      groupBy: async ({ where }: any) => {
        const groups = new Map<string, any>();
        for (const r of rows.filter((r) => matches(r, where))) {
          const key = `${r.country}|${r.countryName}|${r.isRegional}`;
          const g = groups.get(key) ?? { country: r.country, countryName: r.countryName, isRegional: r.isRegional, _min: { retailCents: Infinity }, _count: { _all: 0 } };
          g._min.retailCents = Math.min(g._min.retailCents, r.retailCents);
          g._count._all += 1;
          groups.set(key, g);
        }
        return [...groups.values()];
      },
      findMany: async ({ where }: any) => rows.filter((r) => matches(r, where)).sort((a, b) => a.validityDays - b.validityDays || a.retailCents - b.retailCents),
    },
  } as any;
}

function fakeProvider(id: string, packages: ProviderPackage[]): EsimProvider {
  return { id, listPackages: async () => packages, createOrder: async () => ({ orderNo: '' }), getProfile: async () => null, getUsage: async () => [], cancel: async () => {}, getBalanceCents: async () => 0, parseWebhook: () => null } as unknown as EsimProvider;
}

const config = { get: (_k: string, dflt: string) => dflt } as any;

const kePlan = (over: Partial<ProviderPackage> = {}): ProviderPackage => ({
  packageId: 'KE_1_7', name: 'Kenya 1GB 7Days', country: 'KE', countryName: 'Kenya',
  isRegional: false, dataBytes: 1_073_741_824, validityDays: 7, wholesaleCents: 300, currency: 'USD', smsStatus: 0, ...over,
});

describe('CatalogService.sync', () => {
  it('applies MARKUP_PERCENT and rounds up to the nearest cent', async () => {
    const prisma = fakePrisma();
    const svc = new CatalogService(prisma, fakeProvider('mock', [kePlan({ wholesaleCents: 333 })]), config); // 40% of 333 = 133.2
    await svc.sync();
    expect(prisma._rows[0].retailCents).toBe(Math.ceil(333 * 1.4)); // 467, i.e. rounds up rather than truncating
  });

  it('deactivates packages the provider stopped listing, but not ones still returned', async () => {
    // sync() marks a package stale by comparing its stored syncedAt to this run's `new Date()` marker, so two
    // syncs need distinct timestamps for the comparison to mean anything - fake timers make that deterministic
    // instead of racing real wall-clock resolution (a real provider round-trip makes this a non-issue in prod).
    vi.useFakeTimers();
    try {
      const prisma = fakePrisma();
      const provider = fakeProvider('mock', [kePlan({ packageId: 'KE_1_7' })]);
      const svc = new CatalogService(prisma, provider, config);
      await svc.sync();

      vi.advanceTimersByTime(1);
      provider.listPackages = async () => [kePlan({ packageId: 'KE_3_15', name: 'Kenya 3GB' })]; // KE_1_7 no longer offered
      await svc.sync();

      const byPackageId = Object.fromEntries(prisma._rows.map((r: any) => [r.packageId, r.active]));
      expect(byPackageId['KE_1_7']).toBe(false);
      expect(byPackageId['KE_3_15']).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retires a previous provider\'s whole catalog when PROVIDER is switched, so it cannot still be bought', async () => {
    const prisma = fakePrisma();
    // Seed as if `mock` had already synced and is currently live.
    await new CatalogService(prisma, fakeProvider('mock', [kePlan()]), config).sync();
    expect(prisma._rows.find((r: any) => r.providerId === 'mock').active).toBe(true);

    // Operator flips PROVIDER=esimaccess and restarts; onApplicationBootstrap/sync runs against the new provider.
    const live = new CatalogService(prisma, fakeProvider('esimaccess', [kePlan({ packageId: 'KE_1_7_REAL' })]), config);
    await live.sync();

    expect(prisma._rows.find((r: any) => r.providerId === 'mock').active).toBe(false);
    expect(prisma._rows.find((r: any) => r.providerId === 'esimaccess').active).toBe(true);
  });
});

describe('CatalogService reads', () => {
  it('countries() and packages() only ever surface the currently-active provider\'s rows', async () => {
    const prisma = fakePrisma([
      { id: 'a', providerId: 'mock', packageId: 'KE_1_7', name: 'Old', country: 'KE', countryName: 'Kenya', isRegional: false, retailCents: 100, validityDays: 7, active: true, dataBytes: 1n, currency: 'USD', smsStatus: 0 },
      { id: 'b', providerId: 'esimaccess', packageId: 'KE_1_7_REAL', name: 'Real', country: 'KE', countryName: 'Kenya', isRegional: false, retailCents: 200, validityDays: 7, active: true, dataBytes: 1n, currency: 'USD', smsStatus: 0 },
    ]);
    const svc = new CatalogService(prisma, fakeProvider('esimaccess', []), config);

    const countries = await svc.countries();
    expect(countries).toHaveLength(1);
    expect(countries[0].planCount).toBe(1); // the stale "mock" row must not be counted

    const packages = await svc.packages('KE');
    expect(packages).toHaveLength(1);
    expect(packages[0].name).toBe('Real');
  });
});
