import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EsimAccessError, EsimAccessProvider } from './esimaccess.provider.js';

// Fixtures are trimmed excerpts of REAL example responses from eSIM Access's official Postman collection
// (docs/esim-access.postman_collection.json), so the parsing logic is checked against their actual shapes,
// not assumptions. See that file's "Get All Data Packages" / "Balance Query" / "Query All Allocated Profiles"
// / "Cancel Profile" requests for the originals.
const ok = <T>(obj: T) => ({ json: async () => ({ success: true, errorCode: '0', errorMsg: null, obj }) });
const fail = (errorCode: string, errorMsg: string) => ({ json: async () => ({ success: false, errorCode, errorMsg, obj: null }) });

const locationListResponse = {
  locationList: [
    { code: 'ES', name: 'Spain', type: 1, subLocationList: null },
    { code: 'NA-3', name: 'North America (3 areas)', type: 2, subLocationList: [] },
  ],
};

const packageListResponse = {
  packageList: [
    { packageCode: 'CKH003', slug: 'ES_5_30', name: 'Spain 5GB 30Days', price: 112500, currencyCode: 'USD', volume: 5_368_709_120, duration: 30, durationUnit: 'DAY', location: 'ES', dataType: 1, smsStatus: 0 },
    { packageCode: 'JC016', slug: 'NA-3_1_7', name: 'North America 1GB 7Days', price: 20000, currencyCode: 'USD', volume: 1_073_741_824, duration: 7, durationUnit: 'DAY', location: 'US,CA,MX', dataType: 1, smsStatus: 1 },
    // Excluded from our MVP catalog (daily/unlimited plans need fair-use handling, which is out of scope).
    { packageCode: 'SG_1_Daily', slug: 'SG_1_Daily', name: 'Singapore Daily 1GB', price: 5000, currencyCode: 'USD', volume: 1_073_741_824, duration: 1, durationUnit: 'DAY', location: 'SG', dataType: 4, smsStatus: 0 },
  ],
};

const esimQueryResponse = {
  esimList: [{
    esimTranNo: '23120118156818', orderNo: 'B23120118131854', iccid: '8943108170000775671', smsStatus: 1,
    ac: 'LPA:1$rsp-eu.redteamobile.com$43DE23C67EE747BCAD6B63E8B67B261F',
    qrCodeUrl: 'https://p.qrsim.net/0fa4f29eb25b4d6c84ff4b8422a1da54.png', smdpStatus: 'RELEASED',
    expiredTime: '2024-05-29T18:34:17+0000', totalVolume: 5_368_709_120, orderUsage: 0, esimStatus: 'IN_USE',
  }],
};

function stubFetch(byPath: Record<string, any>) {
  const calls: { path: string; body: any }[] = [];
  const fn = vi.fn(async (url: string, init: any) => {
    const path = String(url).split('/open/')[1];
    calls.push({ path, body: JSON.parse(init.body) });
    const resp = byPath[path];
    if (!resp) throw new Error(`no fixture stubbed for ${path}`);
    return resp;
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

const config = { getOrThrow: () => 'test-access-code' } as any;

describe('EsimAccessProvider', () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.unstubAllGlobals());

  it('parses the real package list shape, keeping only fixed-data DAY plans', async () => {
    stubFetch({ 'location/list': ok(locationListResponse), 'package/list': ok(packageListResponse) });
    const provider = new EsimAccessProvider(config);

    const pkgs = await provider.listPackages();

    expect(pkgs.map((p) => p.packageId)).toEqual(['ES_5_30', 'NA-3_1_7']); // the Daily plan is filtered out
    const spain = pkgs.find((p) => p.packageId === 'ES_5_30')!;
    expect(spain).toMatchObject({ country: 'ES', countryName: 'Spain', isRegional: false, dataBytes: 5_368_709_120, validityDays: 30, wholesaleCents: 1125, currency: 'USD', smsStatus: 0 });
    const na = pkgs.find((p) => p.packageId === 'NA-3_1_7')!;
    expect(na).toMatchObject({ country: 'NA-3', isRegional: true, wholesaleCents: 200, smsStatus: 1 });
  });

  it('converts balance from 1/10,000-USD units to cents', async () => {
    stubFetch({ 'balance/query': ok({ balance: 940_000 }) });
    const provider = new EsimAccessProvider(config);
    expect(await provider.getBalanceCents()).toBe(9400);
  });

  it('splits the eSIM activation code (ac) into SM-DP+ address and activation code', async () => {
    stubFetch({ 'esim/query': ok(esimQueryResponse) });
    const provider = new EsimAccessProvider(config);

    const profile = await provider.getProfile('B23120118131854');

    expect(profile).toMatchObject({
      iccid: '8943108170000775671', esimTranNo: '23120118156818',
      smdpAddress: 'rsp-eu.redteamobile.com', activationCode: '43DE23C67EE747BCAD6B63E8B67B261F',
      totalBytes: 5_368_709_120, activated: true,
    });
  });

  it('treats "still allocating" (200010) as not-ready-yet rather than an error', async () => {
    stubFetch({ 'esim/query': fail('200010', 'Profile is being downloaded for the order.') });
    const provider = new EsimAccessProvider(config);
    await expect(provider.getProfile('B123')).resolves.toBeNull();
  });

  it('propagates other provider errors (e.g. insufficient balance) instead of swallowing them', async () => {
    stubFetch({ 'esim/order': fail('200007', 'Insufficient account balance') });
    const provider = new EsimAccessProvider(config);
    await expect(provider.createOrder({ packageId: 'ES_5_30', transactionId: 't1', wholesaleCents: 1125 }))
      .rejects.toBeInstanceOf(EsimAccessError);
  });

  it('batches usage lookups into groups of 10 esimTranNos', async () => {
    const calls = stubFetch({ 'esim/usage/query': ok({ esimUsageList: [] }) });
    const provider = new EsimAccessProvider(config);
    const twelve = Array.from({ length: 12 }, (_, i) => `T${i}`);

    await provider.getUsage(twelve);

    const usageCalls = calls.filter((c) => c.path === 'esim/usage/query');
    expect(usageCalls).toHaveLength(2);
    expect(usageCalls[0].body.esimTranNoList).toHaveLength(10);
    expect(usageCalls[1].body.esimTranNoList).toHaveLength(2);
  });

  describe('parseWebhook', () => {
    const provider = new EsimAccessProvider(config);

    it('maps ORDER_STATUS/GOT_RESOURCE to ORDER_READY (the signal to fetch the profile)', () => {
      const event = provider.parseWebhook({}, {
        notifyType: 'ORDER_STATUS', notifyId: 'evt-1',
        content: { orderNo: 'B123', orderStatus: 'GOT_RESOURCE', transactionId: 'tx1' },
      });
      expect(event).toMatchObject({ eventId: 'evt-1', type: 'ORDER_READY', orderNo: 'B123' });
    });

    it('passes through ESIM_STATUS / DATA_USAGE / VALIDITY_USAGE', () => {
      for (const [notifyType, type] of [['ESIM_STATUS', 'ESIM_STATUS'], ['DATA_USAGE', 'DATA_USAGE'], ['VALIDITY_USAGE', 'VALIDITY']] as const) {
        expect(provider.parseWebhook({}, { notifyType, notifyId: 'e', content: {} })?.type).toBe(type);
      }
    });

    it('ignores CHECK_HEALTH, SMDP_EVENT, and malformed payloads', () => {
      expect(provider.parseWebhook({}, { notifyType: 'CHECK_HEALTH', notifyId: 'e', content: {} })).toBeNull();
      expect(provider.parseWebhook({}, { notifyType: 'SMDP_EVENT', notifyId: 'e', content: {} })).toBeNull();
      expect(provider.parseWebhook({}, { content: {} })).toBeNull(); // missing notifyId/notifyType
    });
  });
});
