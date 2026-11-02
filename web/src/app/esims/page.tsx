"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getEsims, type EsimInfo } from "@/lib/api";
import { useSession } from "@/lib/session";
import { dataLabel, expiryLabel } from "@/lib/format";

export default function EsimsPage() {
  const { token, signedIn } = useSession();

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-[420px] py-20 text-center">
        <p className="text-4xl">📶</p>
        <p className="mt-3">Sign in to see your eSIMs</p>
        <Link href="/login?next=/esims" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-ink">
          Sign in
        </Link>
      </div>
    );
  }

  return <EsimList token={token!} />;
}

function EsimList({ token }: { token: string }) {
  const [esims, setEsims] = useState<EsimInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "expired">("active");

  function load() {
    getEsims(token)
      .then((list) => {
        setEsims(list);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Something went wrong"));
  }

  useEffect(load, [token]);

  if (error && !esims) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">{error}</p>
        <button onClick={load} className="mt-3 rounded-full border border-outline px-5 py-2 font-bold">
          Try again
        </button>
      </div>
    );
  }
  if (!esims) return <div className="py-20 text-center text-muted">Loading…</div>;

  const active = esims.filter((e) => !isExpired(e));
  const expired = esims.filter((e) => isExpired(e));
  const shown = tab === "active" ? active : expired;

  return (
    <div className="mx-auto max-w-[1080px] px-4 sm:px-8 py-6">
      <nav className="text-sm text-muted mb-2">Home › My eSIMs</nav>
      <div className="flex gap-6 border-b border-outline">
        <button
          onClick={() => setTab("active")}
          className={`py-3 font-bold ${tab === "active" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setTab("expired")}
          className={`py-3 font-bold ${tab === "expired" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
        >
          Expired ({expired.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {tab === "active" ? (
            <>
              No active eSIMs yet.
              <br />
              Pick a destination to get started.
            </>
          ) : (
            "No expired eSIMs."
          )}
        </p>
      ) : (
        <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {shown.map((e) => (
            <EsimCard key={e.id} esim={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function isExpired(e: EsimInfo) {
  return e.status === "EXPIRED" || e.status === "CANCELLED";
}

function EsimCard({ esim }: { esim: EsimInfo }) {
  const left = esim.dataTotalBytes - esim.dataUsedBytes;
  const fraction = esim.dataTotalBytes === 0 ? 0 : Math.min(1, Math.max(0, esim.dataUsedBytes / esim.dataTotalBytes));
  const low = !isExpired(esim) && fraction >= 0.8;

  return (
    <div className="rounded-2xl border border-outline bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex-1 min-w-0 truncate font-extrabold">{esim.countryName}</span>
        <span className="text-sm text-muted">{isExpired(esim) ? "Expired" : expiryLabel(esim.expiresAt)}</span>
      </div>
      <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-outline">
        <div
          className={`h-full rounded-full ${low ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <p className={`mt-1.5 text-sm ${low ? "text-red-600" : "text-muted"}`}>
        {isExpired(esim)
          ? `${dataLabel(esim.dataUsedBytes)} of ${dataLabel(esim.dataTotalBytes)} used`
          : `${dataLabel(Math.max(0, left))} left of ${dataLabel(esim.dataTotalBytes)}`}
      </p>
      <div className="mt-4 flex gap-2">
        {!isExpired(esim) && (
          <Link href={`/orders/${esim.orderId}`} className="flex-1 rounded-full border border-outline py-2 text-center text-sm font-bold">
            📷 QR & details
          </Link>
        )}
        <Link href={`/country/${esim.country}`} className="flex-1 rounded-full bg-primary py-2 text-center text-sm font-bold text-primary-ink">
          + Top up
        </Link>
      </div>
    </div>
  );
}
