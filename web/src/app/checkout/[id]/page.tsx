"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getOrder, mpesaStk, stripeCheckout, type OrderInfo } from "@/lib/api";
import { useSession } from "@/lib/session";
import { dataLabel, daysLabel, flagFor, money } from "@/lib/format";

type Method = "card" | "mpesa";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, signedIn } = useSession();

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("card");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [waitingMsg, setWaitingMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!signedIn) router.replace(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);
  }, [signedIn, router, id]);

  const load = useCallback(() => {
    if (!token) return;
    getOrder(id, token)
      .then((o) => {
        setOrder(o);
        setLoadError(null);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Something went wrong"));
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (order && order.status !== "PENDING_PAYMENT" && !waiting) {
      router.replace(`/orders/${order.id}`);
    }
  }, [order, waiting, router]);

  // The server is the only source of truth for payment (Stripe / Daraja webhooks); we just watch the order.
  function startPolling(message: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    setWaiting(true);
    setWaitingMsg(message);
    const until = Date.now() + 3 * 60_000;
    pollRef.current = setInterval(async () => {
      if (!token) return;
      try {
        const o = await getOrder(id, token);
        if (o.status !== "PENDING_PAYMENT") {
          if (pollRef.current) clearInterval(pollRef.current);
          router.replace(`/orders/${id}`);
        } else if (Date.now() > until) {
          if (pollRef.current) clearInterval(pollRef.current);
          setWaiting(false);
          setPayError("We didn't get a payment confirmation. If you were charged, it will show up here shortly, otherwise try again.");
        }
      } catch {
        /* transient; keep polling */
      }
    }, 2000);
  }

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function pay() {
    if (!order || !token) return;
    setBusy(true);
    setPayError(null);
    try {
      if (method === "card") {
        const url = await stripeCheckout(order.id, token);
        if (!url) {
          startPolling("Processing your card payment…"); // mock mode: completes server-side
        } else {
          window.location.href = url; // Stripe returns to /orders/<id>
        }
      } else {
        const kes = await mpesaStk(order.id, phone.trim(), token);
        startPolling(`Check your phone: enter your M-Pesa PIN to approve KES ${kes}.`);
      }
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !order) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10 text-center">
        <p className="text-muted">{loadError}</p>
        <button onClick={load} className="mt-3 rounded-full border border-outline px-5 py-2 font-bold">
          Try again
        </button>
      </div>
    );
  }
  if (!order) {
    return <div className="py-20 text-center text-muted">Loading…</div>;
  }

  const p = order.package;

  return (
    <div className="mx-auto max-w-[1080px] px-4 sm:px-8 py-6">
      <nav className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        ›{" "}
        <Link href="/destinations" className="hover:text-ink">
          Destinations
        </Link>{" "}
        ›{" "}
        <Link href={`/country/${p.country}`} className="hover:text-ink">
          {p.countryName}
        </Link>{" "}
        › Checkout
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-[5] rounded-2xl bg-outline/40 p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{flagFor(p.country, p.country.includes("-"))}</span>
            <p className="text-lg font-extrabold">{p.countryName}</p>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span>Data</span>
              <span className="font-semibold">{dataLabel(p.dataBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Validity</span>
              <span className="font-semibold">{daysLabel(p.validityDays)}</span>
            </div>
            <hr className="my-3 border-outline" />
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="text-lg font-black">{money(order.priceCents)}</span>
            </div>
          </div>
        </div>

        <div className="flex-[6]">
          {waiting ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-bold">{waitingMsg}</p>
              <p className="text-sm text-muted">Please keep this page open.</p>
            </div>
          ) : (
            <div>
              <p className="font-bold">Pay with</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setMethod("card");
                    setPayError(null);
                  }}
                  className={`flex-1 rounded-full py-2.5 font-bold ${method === "card" ? "bg-primary text-primary-ink" : "border border-outline"}`}
                >
                  💳 Card
                </button>
                <button
                  onClick={() => {
                    setMethod("mpesa");
                    setPayError(null);
                  }}
                  className={`flex-1 rounded-full py-2.5 font-bold ${method === "mpesa" ? "bg-primary text-primary-ink" : "border border-outline"}`}
                >
                  📱 M-Pesa
                </button>
              </div>

              <div className="mt-4">
                {method === "mpesa" ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold">M-Pesa phone number</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full rounded-xl border border-outline bg-surface px-4 py-3 outline-none focus:border-primary"
                    />
                    <span className="mt-1 block text-xs text-muted">
                      You&apos;ll get a PIN prompt on this phone, even if you&apos;re browsing on a computer.
                    </span>
                  </label>
                ) : (
                  <p className="text-muted">You&apos;ll be taken to Stripe&apos;s secure page to pay by card.</p>
                )}
              </div>

              {payError && <p className="mt-3 text-sm text-red-600">{payError}</p>}

              <button
                onClick={pay}
                disabled={busy}
                className="mt-5 w-full rounded-full bg-primary py-3.5 font-bold text-primary-ink disabled:opacity-60"
              >
                {busy ? "…" : method === "card" ? `Pay ${money(order.priceCents)}` : "Send M-Pesa prompt"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
