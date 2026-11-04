// API_BASE must be public (NEXT_PUBLIC_) since catalog pages fetch it both on the server (for SEO)
// and the client (for interactive calls like buying a plan).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3100";

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function send<T>(method: "GET" | "POST", path: string, body?: unknown, token?: string | null): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.");
  }
  const text = await res.text();
  const decoded = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = decoded && typeof decoded === "object" ? (decoded as { message?: string | string[] }).message : null;
    throw new ApiError(Array.isArray(msg) ? msg.join(", ") : msg ?? "Something went wrong", res.status);
  }
  return decoded as T;
}

export interface Country {
  code: string;
  name: string;
  isRegional: boolean;
  popular: boolean;
  fromPriceCents: number;
  planCount: number;
}

export interface Plan {
  id: string;
  name: string;
  country: string;
  countryName: string;
  dataBytes: number;
  validityDays: number;
  priceCents: number;
  /** 0 = no SMS, 1 = can receive SMS, 2 = only SMS sent by us (not useful to customers). */
  smsStatus: number;
  /** 1 = validity counts down from install, 2 = from first network connection abroad. */
  activeType: number;
}

export interface EsimInfo {
  id: string;
  orderId: string;
  iccid: string | null;
  smdpAddress: string | null;
  activationCode: string | null;
  lpaString: string | null;
  status: string;
  dataUsedBytes: number;
  dataTotalBytes: number;
  expiresAt: string | null;
  country: string;
  countryName: string;
  planName: string;
  activeType: number;
}

export interface OrderInfo {
  id: string;
  status: string;
  priceCents: number;
  failureReason: string | null;
  package: Plan;
  esim: EsimInfo | null;
}

export const requestOtp = (identifier: string) =>
  send<{ devCode?: string }>("POST", "/auth/otp/request", { identifier }).then((r) => r.devCode);

export const verifyOtp = (identifier: string, code: string) =>
  send<{ token: string }>("POST", "/auth/otp/verify", { identifier, code }).then((r) => r.token);

export const createOrder = (packageId: string, token: string) =>
  send<OrderInfo>("POST", "/orders", { packageId }, token);

export const getOrder = (id: string, token: string) => send<OrderInfo>("GET", `/orders/${id}`, undefined, token);

export const getEsims = (token: string) => send<EsimInfo[]>("GET", "/esims", undefined, token);

export const pesapalCheckout = (orderId: string, token: string) =>
  send<{ url?: string }>("POST", "/payments/pesapal/checkout", { orderId }, token).then((r) => r.url ?? null);

export const mpesaStk = (orderId: string, phone: string, token: string) =>
  send<{ amountKes: number }>("POST", "/payments/mpesa/stk", { orderId, phone }, token).then((r) => r.amountKes);
