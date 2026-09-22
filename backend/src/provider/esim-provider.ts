// Provider abstraction. Checkout/order logic depends ONLY on this file, never on a
// concrete provider, so a second wholesale provider can be added without touching it.

export interface ProviderPackage {
  packageId: string;
  name: string;
  /** ISO alpha-2 for single-country plans, region code (e.g. "EU-42") for multi-country. */
  country: string;
  countryName: string;
  isRegional: boolean;
  dataBytes: number;
  validityDays: number;
  wholesaleCents: number;
  currency: string;
  /** eSIM Access smsStatus: 0 none, 1 receives SMS from phones and API, 2 API-sent SMS only. */
  smsStatus: number;
}

export interface CreateOrderInput {
  packageId: string;
  /** Our order id; the provider echoes it back so retries can't double-provision. */
  transactionId: string;
  wholesaleCents: number;
}

export interface ProviderProfile {
  iccid: string;
  esimTranNo: string;
  smdpAddress: string;
  activationCode: string;
  qrUrl: string | null;
  totalBytes: number;
  usedBytes: number;
  expiresAt: Date | null;
  activated: boolean;
}

export interface ProviderUsage {
  esimTranNo: string;
  usedBytes: number;
  totalBytes: number;
  updatedAt: Date;
}

export type ProviderEventType = 'ORDER_READY' | 'ESIM_STATUS' | 'DATA_USAGE' | 'VALIDITY' | 'OTHER';

export interface ProviderEvent {
  /** Provider's unique event id, used for idempotent handling. */
  eventId: string;
  type: ProviderEventType;
  orderNo?: string;
  esimTranNo?: string;
  iccid?: string;
}

export abstract class EsimProvider {
  abstract readonly id: string;
  abstract listPackages(): Promise<ProviderPackage[]>;
  /** Debits our prepaid balance at the provider. Returns the provider order number. */
  abstract createOrder(input: CreateOrderInput): Promise<{ orderNo: string }>;
  /** Returns null while the profile is still being allocated. */
  abstract getProfile(orderNo: string): Promise<ProviderProfile | null>;
  abstract getUsage(esimTranNos: string[]): Promise<ProviderUsage[]>;
  abstract cancel(esimTranNo: string): Promise<void>;
  abstract getBalanceCents(): Promise<number>;
  /** Verifies + parses an inbound webhook. Returns null if it should be ignored. */
  abstract parseWebhook(headers: Record<string, unknown>, body: unknown): ProviderEvent | null;
}
