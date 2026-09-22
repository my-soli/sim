import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  CreateOrderInput,
  EsimProvider,
  ProviderEvent,
  ProviderPackage,
  ProviderProfile,
  ProviderUsage,
} from './esim-provider.js';

const GB = 1024 ** 3;
const PROVISION_DELAY_MS = 3000;

// [code, name, base wholesale $/GB]
const COUNTRIES: [string, string, number][] = [
  ['US', 'United States', 1.6], ['GB', 'United Kingdom', 1.2], ['JP', 'Japan', 1.1],
  ['TH', 'Thailand', 0.9], ['FR', 'France', 1.0], ['IT', 'Italy', 1.0],
  ['ES', 'Spain', 1.0], ['DE', 'Germany', 1.0], ['TR', 'Turkey', 1.4],
  ['AE', 'United Arab Emirates', 2.0], ['KE', 'Kenya', 2.4], ['TZ', 'Tanzania', 2.6],
  ['UG', 'Uganda', 2.6], ['ZA', 'South Africa', 1.8], ['EG', 'Egypt', 2.0],
  ['IN', 'India', 1.3], ['SG', 'Singapore', 0.9], ['AU', 'Australia', 1.5],
  ['CA', 'Canada', 1.4], ['MX', 'Mexico', 1.5], ['BR', 'Brazil', 1.7],
  ['KR', 'South Korea', 1.0], ['ID', 'Indonesia', 1.1], ['MA', 'Morocco', 2.1],
];
const REGIONS: [string, string, number][] = [
  ['EU-42', 'Europe (40+ areas)', 1.3], ['AF-29', 'Africa (25+ areas)', 3.2],
  ['AS-12', 'Asia (12 areas)', 1.4], ['GL-139', 'Global (130+ areas)', 3.8],
];
const PLANS: [number, number][] = [[1, 7], [3, 15], [5, 30], [10, 30], [20, 30]];

/**
 * Deterministic, stateless fake of a wholesale provider for local dev + tests.
 * There is no eSIM Access sandbox, so this lets the whole flow run offline.
 * Order numbers encode their creation time, so profiles "provision" after a
 * short delay and usage advances over time - no server-side state to lose on restart.
 */
@Injectable()
export class MockEsimProvider extends EsimProvider {
  readonly id = 'mock';

  async listPackages(): Promise<ProviderPackage[]> {
    const out: ProviderPackage[] = [];
    const add = (code: string, name: string, perGb: number, regional: boolean) => {
      for (const [gb, days] of PLANS) {
        // Larger plans get cheaper per-GB, like real catalogs.
        const cents = Math.round(perGb * gb * (1 - Math.min(gb, 20) * 0.01) * 100);
        out.push({
          packageId: `mock_${code}_${gb}GB_${days}D`,
          name: `${name} ${gb}GB ${days} Days`,
          country: code,
          countryName: name,
          isRegional: regional,
          dataBytes: gb * GB,
          validityDays: days,
          wholesaleCents: cents,
          currency: 'USD',
          // DEMO DATA: the real value comes from the provider's smsStatus. Bigger plans get 1 so the UI can be exercised.
          smsStatus: gb >= 10 ? 1 : gb >= 5 ? 2 : 0,
        });
      }
    };
    COUNTRIES.forEach(([c, n, p]) => add(c, n, p, false));
    REGIONS.forEach(([c, n, p]) => add(c, n, p, true));
    return out;
  }

  async createOrder(input: CreateOrderInput): Promise<{ orderNo: string }> {
    return { orderNo: `MOCK-${Date.now()}-${input.packageId}` };
  }

  async getProfile(orderNo: string): Promise<ProviderProfile | null> {
    const m = /^MOCK-(\d+)-mock_(.+?)_(\d+)GB_(\d+)D$/.exec(orderNo);
    if (!m) return null;
    const created = Number(m[1]);
    if (Date.now() - created < PROVISION_DELAY_MS) return null;
    const hash = createHash('sha256').update(orderNo).digest('hex');
    const iccid = '8985224' + BigInt('0x' + hash.slice(0, 12)).toString().padStart(13, '0').slice(0, 13);
    const total = Number(m[3]) * GB;
    return {
      iccid,
      esimTranNo: `MT${created}-${m[3]}`,
      smdpAddress: 'smdp.demo-esim.example',
      activationCode: hash.slice(12, 28).toUpperCase(),
      qrUrl: null, // client renders the QR from the LPA string
      totalBytes: total,
      usedBytes: this.usedFor(created, total),
      expiresAt: new Date(created + Number(m[4]) * 86_400_000),
      activated: true,
    };
  }

  async getUsage(esimTranNos: string[]): Promise<ProviderUsage[]> {
    // Stateless: the transaction number encodes creation time + plan size.
    return esimTranNos.flatMap((esimTranNo) => {
      const m = /^MT(\d+)-(\d+)$/.exec(esimTranNo);
      if (!m) return [];
      const total = Number(m[2]) * GB;
      return [{ esimTranNo, usedBytes: this.usedFor(Number(m[1]), total), totalBytes: total, updatedAt: new Date() }];
    });
  }

  async cancel(): Promise<void> {}

  async getBalanceCents(): Promise<number> {
    return 100_000;
  }

  parseWebhook(): ProviderEvent | null {
    return null; // the mock never calls back; the poller covers provisioning
  }

  /** ~1% of the plan per minute since creation, capped at 92%, so the UI shows movement. */
  private usedFor(createdMs: number, total: number) {
    const minutes = (Date.now() - createdMs) / 60_000;
    return Math.floor(total * Math.min(0.92, minutes * 0.01));
  }
}
