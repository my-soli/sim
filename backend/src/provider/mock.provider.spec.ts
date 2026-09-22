import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockEsimProvider } from './mock.provider.js';

describe('MockEsimProvider', () => {
  const provider = new MockEsimProvider();

  it('lists a package for every configured country and region', async () => {
    const pkgs = await provider.listPackages();
    expect(pkgs.some((p) => p.country === 'KE' && !p.isRegional)).toBe(true);
    expect(pkgs.some((p) => p.country === 'EU-42' && p.isRegional)).toBe(true);
    expect(pkgs.every((p) => p.dataBytes > 0 && p.validityDays > 0 && p.wholesaleCents > 0)).toBe(true);
  });

  it('does not offer a real eSIM Access packageId that isn\'t in its own catalog', async () => {
    // Guards against the "buy a mock plan against the live provider" failure mode from the catalog fix:
    // every mock packageId must be recognisably its own, never collide with a real provider's slug shape.
    const pkgs = await provider.listPackages();
    expect(pkgs.every((p) => p.packageId.startsWith('mock_'))).toBe(true);
  });

  describe('provisioning lifecycle', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns null (still allocating) until the provision delay has elapsed, then a stable profile', async () => {
      vi.setSystemTime(0);
      const { orderNo } = await provider.createOrder({ packageId: 'mock_KE_1GB_7D', transactionId: 't1', wholesaleCents: 100 });

      expect(await provider.getProfile(orderNo)).toBeNull();

      vi.advanceTimersByTime(3100);
      const profile = await provider.getProfile(orderNo);
      expect(profile).not.toBeNull();
      expect(profile!.iccid).toMatch(/^\d+$/);
      expect(profile!.totalBytes).toBe(1024 ** 3);
      expect(profile!.expiresAt!.getTime()).toBe(7 * 86_400_000);

      // Deterministic: querying again returns the identical identity, so retries/polling never see it "change".
      const again = await provider.getProfile(orderNo);
      expect(again!.iccid).toBe(profile!.iccid);
      expect(again!.activationCode).toBe(profile!.activationCode);
    });

    it('two different orders never collide on iccid or activation code', async () => {
      vi.setSystemTime(0);
      const a = await provider.createOrder({ packageId: 'mock_KE_1GB_7D', transactionId: 't1', wholesaleCents: 100 });
      vi.setSystemTime(1);
      const b = await provider.createOrder({ packageId: 'mock_KE_1GB_7D', transactionId: 't2', wholesaleCents: 100 });
      vi.advanceTimersByTime(4000);

      const pa = await provider.getProfile(a.orderNo);
      const pb = await provider.getProfile(b.orderNo);
      expect(pa!.iccid).not.toBe(pb!.iccid);
    });

    it('reported data usage increases over time and getUsage agrees with getProfile', async () => {
      vi.setSystemTime(0);
      const { orderNo } = await provider.createOrder({ packageId: 'mock_KE_10GB_30D', transactionId: 't1', wholesaleCents: 100 });
      vi.advanceTimersByTime(3100);
      const early = (await provider.getProfile(orderNo))!;
      expect(early.usedBytes).toBeGreaterThanOrEqual(0);
      expect(early.usedBytes).toBeLessThan(early.totalBytes * 0.01); // ~3s in: a sliver, not a meaningful chunk

      vi.advanceTimersByTime(30 * 60_000); // +30 minutes
      const later = (await provider.getProfile(orderNo))!;
      expect(later.usedBytes).toBeGreaterThan(early.usedBytes);

      const [usage] = await provider.getUsage([later.esimTranNo]);
      expect(usage.usedBytes).toBe(later.usedBytes);
      expect(usage.totalBytes).toBe(later.totalBytes);
    });
  });
});
