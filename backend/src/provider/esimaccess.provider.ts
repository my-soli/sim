import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateOrderInput,
  EsimProvider,
  ProviderEvent,
  ProviderPackage,
  ProviderProfile,
  ProviderUsage,
} from './esim-provider.js';

/** Thrown for eSIM Access `success:false` envelopes; `code` is their errorCode (e.g. "200010", "200007"). */
export class EsimAccessError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) {
    super(`eSIM Access ${path} failed: ${code} ${message}`);
  }
}

interface Envelope<T> {
  success: boolean;
  errorCode: string | null;
  errorMsg?: string | null;
  errorMessage?: string | null;
  obj: T;
}

// Endpoint shapes below come from the official Postman collection (docs/esim-access.postman_collection.json).
// Conventions: money is expressed in 1/10,000 of a USD (10000 = $1.00) => cents = value / 100.
//              data volumes are bytes, times are UTC ISO, rate limit is 8 requests/second.
const UNITS_PER_CENT = 100;
const MIN_GAP_MS = 140; // keeps us under 8 req/s
const ALLOCATING = '200010'; // "SM-DP+ is still allocating profiles for the order"

@Injectable()
export class EsimAccessProvider extends EsimProvider {
  readonly id = 'esimaccess';
  private readonly baseUrl = 'https://api.esimaccess.com/api/v1/open';
  private lastCall = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: ConfigService) {
    super();
  }

  /** Serialises calls with a minimum gap so parallel jobs can't exceed the provider rate limit. */
  private throttled<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastCall + MIN_GAP_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastCall = Date.now();
      return fn();
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private post<T>(path: string, body: unknown = {}): Promise<T> {
    return this.throttled(async () => {
      const res = await fetch(`${this.baseUrl}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'RT-AccessCode': this.config.getOrThrow<string>('ESIMACCESS_ACCESS_CODE') },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const json = (await res.json()) as Envelope<T>;
      if (!json.success) {
        throw new EsimAccessError(String(json.errorCode ?? 'unknown'), json.errorMsg ?? json.errorMessage ?? '', path);
      }
      return json.obj;
    });
  }

  async listPackages(): Promise<ProviderPackage[]> {
    const [locs, pkgs] = await Promise.all([
      this.post<{ locationList: { code: string; name: string }[] }>('location/list'),
      this.post<{ packageList: RawPackage[] }>('package/list', { type: 'BASE' }),
    ]);
    const names = new Map((locs.locationList ?? []).map((l) => [l.code, l.name]));
    const out: ProviderPackage[] = [];
    for (const p of pkgs.packageList ?? []) {
      // MVP scope: fixed-data plans only (no daily/unlimited plans, which need fair-use handling).
      if (p.dataType !== undefined && p.dataType !== 1) continue;
      if (p.durationUnit !== 'DAY') continue;
      const slug = p.slug ?? p.packageCode;
      // Slugs look like "<LOCATION>_<GB>_<DAYS>": AU_1_7 (country) or NA-3_1_7 (region).
      const country = slug.split('_')[0];
      out.push({
        packageId: slug,
        name: p.name,
        country,
        countryName: names.get(country) ?? p.name.replace(/\s+\d[\d.]*\s*(GB|MB).*$/i, ''),
        isRegional: country.includes('-') || (p.location ?? '').includes(','),
        dataBytes: p.volume,
        validityDays: p.duration,
        wholesaleCents: Math.round(p.price / UNITS_PER_CENT),
        currency: p.currencyCode ?? 'USD',
        smsStatus: p.smsStatus ?? 0,
      });
    }
    return out;
  }

  async createOrder(input: CreateOrderInput): Promise<{ orderNo: string }> {
    // transactionId is our order id: a retried request with the same id is treated as the same order by the provider.
    // We deliberately don't send the optional price check: our stored cents can't represent sub-cent prices exactly.
    const obj = await this.post<{ orderNo: string }>('esim/order', {
      transactionId: input.transactionId,
      packageInfoList: [{ packageCode: input.packageId, count: 1 }],
    });
    return { orderNo: obj.orderNo };
  }

  async getProfile(orderNo: string): Promise<ProviderProfile | null> {
    let obj: { esimList?: RawEsim[] };
    try {
      obj = await this.post('esim/query', { orderNo, pager: { pageNum: 1, pageSize: 50 } });
    } catch (e) {
      if (e instanceof EsimAccessError && e.code === ALLOCATING) return null;
      throw e;
    }
    const e = obj.esimList?.[0];
    if (!e?.ac) return null;
    // ac = LPA:1${SM-DP+ address}${matching id}
    const [, smdpAddress = '', activationCode = ''] = e.ac.split('$');
    return {
      iccid: e.iccid,
      esimTranNo: e.esimTranNo,
      smdpAddress,
      activationCode,
      qrUrl: e.qrCodeUrl ?? null,
      totalBytes: e.totalVolume,
      usedBytes: e.orderUsage ?? 0,
      expiresAt: e.expiredTime ? new Date(e.expiredTime) : null,
      activated: e.esimStatus === 'IN_USE',
    };
  }

  async getUsage(esimTranNos: string[]): Promise<ProviderUsage[]> {
    const out: ProviderUsage[] = [];
    for (let i = 0; i < esimTranNos.length; i += 10) {
      const obj = await this.post<{
        esimUsageList: { esimTranNo: string; dataUsage: number; totalData: number; lastUpdateTime: string }[];
      }>('esim/usage/query', { esimTranNoList: esimTranNos.slice(i, i + 10) });
      for (const u of obj.esimUsageList ?? []) {
        out.push({ esimTranNo: u.esimTranNo, usedBytes: u.dataUsage, totalBytes: u.totalData, updatedAt: new Date(u.lastUpdateTime) });
      }
    }
    return out;
  }

  /** Only works while the profile is unused and not installed; the price is refunded to our provider balance. */
  async cancel(esimTranNo: string): Promise<void> {
    await this.post('esim/cancel', { esimTranNo });
  }

  async getBalanceCents(): Promise<number> {
    const obj = await this.post<{ balance: number }>('balance/query');
    return Math.round(obj.balance / UNITS_PER_CENT);
  }

  parseWebhook(_headers: Record<string, unknown>, body: unknown): ProviderEvent | null {
    const b = body as {
      notifyType?: string;
      notifyId?: string;
      content?: { orderNo?: string; orderStatus?: string; iccid?: string; esimTranNo?: string };
    };
    if (!b?.notifyId || !b.notifyType) return null;
    const c = b.content ?? {};
    const base = { eventId: b.notifyId, orderNo: c.orderNo, esimTranNo: c.esimTranNo, iccid: c.iccid };
    switch (b.notifyType) {
      case 'ORDER_STATUS':
        // GOT_RESOURCE carries orderNo but NOT the ICCID: the handler must call esim/query afterwards.
        return c.orderStatus === 'GOT_RESOURCE' ? { ...base, type: 'ORDER_READY' } : { ...base, type: 'OTHER' };
      case 'ESIM_STATUS':
        return { ...base, type: 'ESIM_STATUS' };
      case 'DATA_USAGE':
        return { ...base, type: 'DATA_USAGE' };
      case 'VALIDITY_USAGE':
        return { ...base, type: 'VALIDITY' };
      default:
        return null; // CHECK_HEALTH, SMDP_EVENT: acknowledged, nothing to do
    }
  }
}

interface RawPackage {
  packageCode: string;
  slug?: string;
  name: string;
  price: number;
  currencyCode?: string;
  volume: number;
  duration: number;
  durationUnit: string;
  location?: string;
  smsStatus?: number;
  dataType?: number;
}

interface RawEsim {
  esimTranNo: string;
  iccid: string;
  ac?: string;
  qrCodeUrl?: string;
  totalVolume: number;
  orderUsage?: number;
  expiredTime?: string;
  esimStatus?: string;
}
