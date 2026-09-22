import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../notifications/notifications.js';
import { EsimProvider, ProviderEvent, ProviderProfile } from '../provider/esim-provider.js';
import { OrdersService } from './orders.js';

// Minimal in-memory stand-in for PrismaService, covering only the shapes OrdersService actually calls.
// Not a query engine - just enough state + filtering to exercise the state machine and its idempotency guards.
function fakePrisma() {
  const packages = new Map<string, any>();
  const users = new Map<string, any>();
  const orders = new Map<string, any>();
  const esims = new Map<string, any>(); // keyed by orderId
  const webhookEventIds = new Set<string>();
  const walletTxns: any[] = [];
  let seq = 0;

  const withRelations = (o: any) => ({ ...o, package: packages.get(o.packageRefId), user: users.get(o.userId), esim: esims.get(o.id) });

  return {
    _seed: { packages, users, orders },
    packageCache: {
      findFirst: async ({ where }: any) => {
        const p = packages.get(where.id);
        return p && (where.active === undefined || p.active === where.active) ? p : null;
      },
    },
    order: {
      create: async ({ data }: any) => {
        const id = `order-${++seq}`;
        const row = { id, status: 'PENDING_PAYMENT', providerOrderNo: null, failureReason: null, createdAt: new Date(), updatedAt: new Date(), ...data };
        orders.set(id, row);
        return row;
      },
      findFirst: async ({ where }: any) => {
        const o = orders.get(where.id);
        if (!o) return null;
        if (where.userId && o.userId !== where.userId) return null;
        if (where.providerOrderNo && o.providerOrderNo !== where.providerOrderNo) return null;
        return withRelations(o);
      },
      findUnique: async ({ where }: any) => (orders.has(where.id) ? withRelations(orders.get(where.id)) : null),
      findUniqueOrThrow: async ({ where }: any) => {
        if (!orders.has(where.id)) throw new Error('not found');
        return withRelations(orders.get(where.id));
      },
      findMany: async ({ where, select }: any) => {
        let rows = [...orders.values()];
        if (where?.userId) rows = rows.filter((o) => o.userId === where.userId);
        if (where?.status) rows = rows.filter((o) => o.status === where.status);
        if (where?.updatedAt?.lt) rows = rows.filter((o) => o.updatedAt < where.updatedAt.lt);
        // list() passes `select: {id: true}`; reconcile() passes no select and needs full rows (e.g. updatedAt).
        return select?.id ? rows.map((o) => ({ id: o.id })) : rows;
      },
      updateMany: async ({ where, data }: any) => {
        const o = orders.get(where.id);
        if (!o || o.status !== where.status) return { count: 0 };
        Object.assign(o, data, { updatedAt: new Date() });
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        const o = orders.get(where.id);
        Object.assign(o, data, { updatedAt: new Date() });
        return o;
      },
    },
    esim: {
      upsert: async ({ where, update, create }: any) => {
        const existing = esims.get(where.orderId);
        const row = existing ? Object.assign(existing, update) : { id: `esim-${++seq}`, ...create };
        esims.set(where.orderId, row);
        return row;
      },
    },
    walletTxn: { create: async ({ data }: any) => { walletTxns.push(data); return data; } },
    providerWebhookEvent: {
      create: async ({ data }: any) => {
        if (webhookEventIds.has(data.notifyId)) throw new Error('duplicate key');
        webhookEventIds.add(data.notifyId);
        return data;
      },
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  } as any;
}

function fakeProvider(overrides: Partial<EsimProvider> = {}): EsimProvider {
  return {
    id: 'fake',
    listPackages: vi.fn(),
    createOrder: vi.fn(async () => ({ orderNo: 'PROV-1' })),
    getProfile: vi.fn(async () => null),
    getUsage: vi.fn(async () => []),
    cancel: vi.fn(),
    getBalanceCents: vi.fn(),
    parseWebhook: vi.fn(() => null),
    ...overrides,
  } as unknown as EsimProvider;
}

const profile: ProviderProfile = {
  iccid: '8988',
  esimTranNo: 'T1',
  smdpAddress: 'smdp.example',
  activationCode: 'ABC123',
  qrUrl: null,
  totalBytes: 1_000_000,
  usedBytes: 0,
  expiresAt: new Date('2030-01-01'),
  activated: true,
};

function setup(providerOverrides: Partial<EsimProvider> = {}) {
  const prisma = fakePrisma();
  const provider = fakeProvider(providerOverrides);
  const notify = { email: vi.fn() } as unknown as NotificationsService;
  const svc = new OrdersService(prisma, provider, notify);
  prisma._seed.users.set('user-1', { id: 'user-1', email: 'buyer@example.com' });
  prisma._seed.packages.set('pkg-1', {
    id: 'pkg-1', packageId: 'KE_1_7', active: true, retailCents: 500, wholesaleCents: 300,
    country: 'KE', countryName: 'Kenya', name: 'Kenya 1GB', dataBytes: 1073741824n, validityDays: 7, currency: 'USD',
  });
  return { prisma, provider, notify, svc };
}

describe('OrdersService payment -> provisioning', () => {
  it('onPaymentSucceeded is idempotent: a duplicate webhook does not re-provision', async () => {
    const { prisma, provider, svc } = setup();
    const order = await svc.create('user-1', 'pkg-1');

    await svc.onPaymentSucceeded(order.id);
    await svc.onPaymentSucceeded(order.id); // e.g. Stripe redelivers the same event
    await new Promise((r) => setTimeout(r, 0)); // let the fire-and-forget fulfil() microtask run

    expect(provider.createOrder).toHaveBeenCalledTimes(1);
    expect(prisma.order.findUnique({ where: { id: order.id } })).resolves.toMatchObject({ providerOrderNo: 'PROV-1' });
  });

  it('marks the order FAILED with a reason when the provider rejects the order, without touching the wallet', async () => {
    const { prisma, svc } = setup({ createOrder: vi.fn(async () => { throw new Error('200007 Insufficient account balance'); }) });
    const order = await svc.create('user-1', 'pkg-1');

    await svc.onPaymentSucceeded(order.id);
    await new Promise((r) => setTimeout(r, 0));

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after.status).toBe('FAILED');
    expect(after.failureReason).toContain('Insufficient account balance');
  });

  it('tryComplete leaves the order PROVISIONING while the provider has not allocated a profile yet', async () => {
    const { prisma, svc } = setup();
    const order = await svc.create('user-1', 'pkg-1');
    await svc.onPaymentSucceeded(order.id);
    await new Promise((r) => setTimeout(r, 0));

    const done = await svc.tryComplete(order.id);
    expect(done).toBe(false);
    expect((await prisma.order.findUnique({ where: { id: order.id } })).status).toBe('PROVISIONING');
  });

  it('tryComplete stores the eSIM, marks the order READY and emails the customer exactly once', async () => {
    const { prisma, notify, svc } = setup({ getProfile: vi.fn(async () => profile) });
    const order = await svc.create('user-1', 'pkg-1');
    await svc.onPaymentSucceeded(order.id);
    await new Promise((r) => setTimeout(r, 0));

    expect(await svc.tryComplete(order.id)).toBe(true);
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after.status).toBe('READY');
    expect(after.esim.iccid).toBe(profile.iccid);
    expect(after.esim.dataTotalBytes).toBe(BigInt(profile.totalBytes));
    expect(notify.email).toHaveBeenCalledTimes(1);
    expect(notify.email).toHaveBeenCalledWith('buyer@example.com', expect.stringContaining('Kenya'), expect.stringContaining(profile.activationCode));

    // Calling again once READY must be a no-op, not a second email or provider call.
    expect(await svc.tryComplete(order.id)).toBe(true);
    expect(notify.email).toHaveBeenCalledTimes(1);
  });

  it('handleProviderWebhook ignores a redelivered notifyId (dedup)', async () => {
    const { prisma, provider, svc } = setup({ getProfile: vi.fn(async () => profile) });
    const order = await svc.create('user-1', 'pkg-1');
    await svc.onPaymentSucceeded(order.id);
    await new Promise((r) => setTimeout(r, 0));

    const event: ProviderEvent = { eventId: 'evt-1', type: 'ORDER_READY', orderNo: 'PROV-1' };
    (provider.parseWebhook as any).mockReturnValue(event);

    await svc.handleProviderWebhook({}, {});
    await svc.handleProviderWebhook({}, {}); // provider redelivers the same event

    expect((await prisma.order.findUnique({ where: { id: order.id } })).status).toBe('READY');
    expect(provider.getProfile).toHaveBeenCalledTimes(1);
  });

  it('reconcile gives up on an order the provider never delivered', async () => {
    const { prisma, svc } = setup();
    const order = await svc.create('user-1', 'pkg-1');
    await svc.onPaymentSucceeded(order.id);
    await new Promise((r) => setTimeout(r, 0));
    // Simulate 31 minutes of silence from the provider.
    prisma._seed.orders.get(order.id).updatedAt = new Date(Date.now() - 31 * 60_000);

    await svc.reconcile();

    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after.status).toBe('FAILED');
    expect(after.failureReason).toMatch(/did not deliver/i);
  });
});
