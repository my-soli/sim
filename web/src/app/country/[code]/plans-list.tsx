"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrder, type Plan } from "@/lib/api";
import { useSession } from "@/lib/session";
import { activeTypeLabel, dataLabel, daysLabel, money } from "@/lib/format";

export function PlansList({ code, initialPlans }: { code: string; initialPlans: Plan[] }) {
  const [days, setDays] = useState<number | null>(null);
  const [smsOnly, setSmsOnly] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token, signedIn } = useSession();

  const durations = Array.from(new Set(initialPlans.map((p) => p.validityDays))).sort((a, b) => a - b);
  const hasSms = initialPlans.some((p) => p.smsStatus === 1);
  const shown = initialPlans.filter(
    (p) => (days === null || p.validityDays === days) && (!smsOnly || p.smsStatus === 1),
  );

  async function buy(p: Plan) {
    if (!signedIn || !token) {
      router.push(`/login?next=${encodeURIComponent(`/country/${code}`)}`);
      return;
    }
    setBuying(p.id);
    setError(null);
    try {
      const order = await createOrder(p.id, token);
      router.push(`/checkout/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBuying(null);
    }
  }

  if (initialPlans.length === 0) {
    return <p className="mt-10 text-muted">No plans are currently available for this destination.</p>;
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={days ?? ""}
          onChange={(e) => setDays(e.target.value ? Number(e.target.value) : null)}
          className="rounded-full border border-outline bg-surface px-3 py-2 text-sm"
        >
          <option value="">Any validity</option>
          {durations.map((d) => (
            <option key={d} value={d}>
              {daysLabel(d)}
            </option>
          ))}
        </select>
        {hasSms && (
          <label className="flex items-center gap-1.5 rounded-full border border-outline bg-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={smsOnly} onChange={(e) => setSmsOnly(e.target.checked)} />
            Can receive SMS
          </label>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-2.5">
        {shown.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-outline bg-surface p-4 sm:p-5"
          >
            <div className="flex-1 min-w-[180px]">
              <p className="text-lg font-black">{dataLabel(p.dataBytes)}</p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span>⏱ {daysLabel(p.validityDays)}</span>
                {p.smsStatus === 1 && <span className="font-bold text-primary">✉ SMS</span>}
              </div>
              <p className="mt-0.5 text-xs text-muted">{activeTypeLabel(p.activeType)}</p>
            </div>
            <p className="font-extrabold">{money(p.priceCents)}</p>
            <button
              onClick={() => buy(p)}
              disabled={buying === p.id}
              className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-ink disabled:opacity-60"
            >
              {buying === p.id ? "…" : "Buy now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
