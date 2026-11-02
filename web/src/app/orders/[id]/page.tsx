"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ApiError, getOrder, type OrderInfo } from "@/lib/api";
import { useSession } from "@/lib/session";
import { activeTypeLabel, dataLabel, daysLabel } from "@/lib/format";

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, signedIn } = useSession();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!signedIn) router.replace(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
  }, [signedIn, router, id]);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const o = await getOrder(id, token!);
        setOrder(o);
        setError(null);
        if (["READY", "FAILED", "REFUNDED"].includes(o.status) && timerRef.current) {
          clearInterval(timerRef.current);
        }
      } catch (e) {
        setError((prev) => (order ? prev : e instanceof ApiError ? e.message : "Something went wrong"));
      }
    }
    load();
    timerRef.current = setInterval(load, 2000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  return (
    <div className="mx-auto max-w-[1080px] px-4 sm:px-8 py-6">
      <nav className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        ›{" "}
        <Link href="/esims" className="hover:text-ink">
          My eSIMs
        </Link>{" "}
        › Order
      </nav>

      {error && !order ? (
        <div className="py-20 text-center">
          <p className="text-muted">{error}</p>
        </div>
      ) : !order ? (
        <div className="py-20 text-center text-muted">Loading…</div>
      ) : order.status === "READY" ? (
        <OrderReady order={order} />
      ) : order.status === "FAILED" ? (
        <StatusMessage
          icon="⚠️"
          title="We couldn't deliver your eSIM"
          body="Your order hit a problem on our side. You haven't lost anything: contact support and we'll refund you."
        />
      ) : order.status === "REFUNDED" ? (
        <StatusMessage icon="↩️" title="Order refunded" body="This order was refunded." />
      ) : order.status === "PENDING_PAYMENT" ? (
        <StatusMessage
          icon="💳"
          title="Payment needed"
          body="This order hasn't been paid yet."
          action={
            <Link href={`/checkout/${order.id}`} className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-ink">
              Go to checkout
            </Link>
          }
        />
      ) : (
        <StatusMessage busy title="Preparing your eSIM…" body="Payment received. This usually takes a few seconds." />
      )}
    </div>
  );
}

function StatusMessage({
  icon,
  busy,
  title,
  body,
  action,
}: {
  icon?: string;
  busy?: boolean;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[420px] py-16 text-center">
      {busy ? (
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-outline border-t-primary" />
      ) : (
        <span className="text-5xl">{icon}</span>
      )}
      <p className="mt-5 text-xl font-extrabold">{title}</p>
      <p className="mt-2 text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function OrderReady({ order }: { order: OrderInfo }) {
  const e = order.esim!;
  const p = order.package;

  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-10 py-5">
      <div className="flex flex-col items-center">
        <div className="rounded-2xl border border-outline bg-white p-4">
          {e.lpaString ? (
            <QRCodeSVG value={e.lpaString} size={220} />
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center text-center text-sm text-muted">
              QR unavailable. Use manual details.
            </div>
          )}
        </div>
        <p className="mt-3 max-w-[260px] text-center text-sm text-muted">
          Scan with the phone you want to install the eSIM on.
        </p>
      </div>

      <div className="flex-1">
        <p className="text-xl font-extrabold">
          {p.countryName} · {dataLabel(p.dataBytes)} · {daysLabel(p.validityDays)}
        </p>
        <p className="mt-1 text-muted">Ready to install. Keep these details handy; you can find them again in My eSIMs.</p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-outline/50 px-3 py-2 text-sm">
          ℹ️ {activeTypeLabel(e.activeType)}
        </div>

        <p className="mt-5 font-bold">Manual activation</p>
        <CopyField label="SM-DP+ address" value={e.smdpAddress ?? ""} />
        <CopyField label="Activation code" value={e.activationCode ?? ""} />
        {e.lpaString && <CopyField label="Full activation string (LPA)" value={e.lpaString} />}

        <Link href="/install" className="mt-4 block rounded-full bg-primary py-3 text-center font-bold text-primary-ink">
          ⬇️ How to install
        </Link>
        <Link href="/esims" className="mt-2 block rounded-full border border-outline py-3 text-center font-bold">
          View in My eSIMs
        </Link>
      </div>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl bg-outline/40 px-3.5 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-mono font-semibold">{value}</p>
      </div>
      <button
        aria-label="Copy"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="text-muted"
      >
        {copied ? "✓" : "📋"}
      </button>
    </div>
  );
}
