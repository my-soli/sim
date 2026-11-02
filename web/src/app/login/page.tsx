"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ApiError, requestOtp, verifyOtp } from "@/lib/api";
import { useSession } from "@/lib/session";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { signIn } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const dev = await requestOtp(identifier.trim());
      setCodeSent(true);
      setDevCode(dev ?? null);
      if (dev) setCode(dev);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const token = await verifyOtp(identifier.trim(), code.trim());
      signIn(token);
      router.push(next ?? "/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 py-10">
      <nav className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        › Sign in
      </nav>
      <h1 className="text-2xl font-extrabold">Welcome</h1>
      <p className="mt-2 text-muted">
        {codeSent ? `Enter the 6-digit code we sent to ${identifier.trim()}.` : "Sign in with your email or phone number. We'll send you a one-time code."}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Email or phone (+254…)</span>
          <input
            value={identifier}
            disabled={codeSent || busy}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !codeSent && send()}
            className="w-full rounded-xl border border-outline bg-surface px-4 py-3 outline-none focus:border-primary disabled:opacity-60"
          />
        </label>

        {codeSent && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Code</span>
            <input
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              className="w-full rounded-xl border border-outline bg-surface px-4 py-3 outline-none focus:border-primary"
            />
            {devCode && <span className="mt-1 block text-xs text-muted">Dev mode: code prefilled ({devCode})</span>}
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={busy ? undefined : codeSent ? verify : send}
          disabled={busy}
          className="rounded-full bg-primary py-3.5 font-bold text-primary-ink disabled:opacity-60"
        >
          {busy ? "…" : codeSent ? "Verify and continue" : "Send code"}
        </button>

        {codeSent && (
          <button onClick={() => setCodeSent(false)} className="font-semibold text-primary">
            Use a different email or phone
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
