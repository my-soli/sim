"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "./brand-mark";
import { useSession } from "@/lib/session";

const NAV_ITEMS = [
  { label: "Destinations", href: "/destinations" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Help", href: "/help" },
];

function AuthButton({ className = "" }: { className?: string }) {
  const { signedIn, signOut } = useSession();
  const router = useRouter();
  if (signedIn) {
    return (
      <button
        className={`rounded-full px-4 py-2 text-sm font-bold hover:bg-outline/60 ${className}`}
        onClick={() => {
          signOut();
          router.push("/");
        }}
      >
        Sign out
      </button>
    );
  }
  return (
    <Link
      href="/login"
      className={`rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-ink hover:opacity-90 ${className}`}
    >
      Sign in
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-6 px-4 sm:px-8">
        <BrandMark />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-[15px] font-bold text-ink hover:bg-outline/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block flex-1" />

        <form
          className="hidden md:block w-60"
          onSubmit={(e) => {
            e.preventDefault();
            const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
            router.push(q ? `/destinations?q=${encodeURIComponent(q)}` : "/destinations");
          }}
        >
          <input
            name="q"
            placeholder="Where to?"
            className="w-full rounded-full border border-outline bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          />
        </form>

        <Link href="/esims" className="hidden md:block rounded-full px-3 py-2 text-[15px] font-bold text-ink hover:bg-outline/50">
          My eSIMs
        </Link>

        <div className="hidden md:block">
          <AuthButton />
        </div>

        {/* Mobile */}
        <div className="flex-1 md:hidden" />
        <button
          aria-label="Open menu"
          className="md:hidden rounded-full p-2 hover:bg-outline/50"
          onClick={() => setOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <BrandMark />
              <button aria-label="Close menu" className="rounded-full p-2 hover:bg-outline/50" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {[...NAV_ITEMS, { label: "My eSIMs", href: "/esims" }, { label: "About", href: "/about" }, { label: "Contact", href: "/contact" }].map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-3 text-base font-bold text-ink hover:bg-outline/50"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
            <div className="mt-6">
              <AuthButton className="block text-center w-full" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
