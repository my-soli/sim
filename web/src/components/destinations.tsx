import Link from "next/link";
import type { Country } from "@/lib/api";
import { flagFor, money } from "@/lib/format";

export function PopularGrid({ countries }: { countries: Country[] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
      {countries.map((c) => (
        <Link
          key={c.code}
          href={`/country/${c.code}`}
          className="flex flex-col justify-between rounded-2xl bg-outline/40 p-3.5 hover:bg-outline/60"
          style={{ minHeight: 132 }}
        >
          <span className="text-3xl">{flagFor(c.code)}</span>
          <span>
            <span className="block truncate font-bold">{c.name}</span>
            <span className="block text-sm text-muted">from {money(c.fromPriceCents)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CountryGrid({ countries }: { countries: Country[] }) {
  if (countries.length === 0) {
    return <p className="py-8 text-muted">No destinations match your search.</p>;
  }
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {countries.map((c) => (
        <Link
          key={c.code}
          href={`/country/${c.code}`}
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-outline/40"
        >
          <span className="text-[28px] leading-none">{flagFor(c.code, c.isRegional)}</span>
          <span className="flex-1 min-w-0">
            <span className="block truncate font-semibold">{c.name}</span>
            <span className="block text-sm text-muted">
              {c.planCount} plans · from {money(c.fromPriceCents)}
            </span>
          </span>
          <span aria-hidden className="text-muted">
            ›
          </span>
        </Link>
      ))}
    </div>
  );
}
