import type { Metadata } from "next";
import Link from "next/link";
import { ContentWidth } from "@/components/content-width";
import { getPlans } from "@/lib/catalog";
import { flagFor, money } from "@/lib/format";
import { PlansList } from "./plans-list";

// Live pricing/catalog data per destination: always render fresh, never freeze a build-time snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const plans = await getPlans(code).catch(() => []);
  const name = plans[0]?.countryName ?? code;
  return {
    title: `eSIM data plans for ${name}`,
    description: `Compare eSIM data plans for ${name}. Pay by card or M-Pesa and get connected in minutes.`,
  };
}

export default async function CountryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const plans = await getPlans(code);
  const title = plans[0]?.countryName ?? "Plans";
  const from = plans.length ? Math.min(...plans.map((p) => p.priceCents)) : 0;

  return (
    <ContentWidth max={900} className="py-6">
      <nav className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        ›{" "}
        <Link href="/destinations" className="hover:text-ink">
          Destinations
        </Link>{" "}
        › {title}
      </nav>

      <div className="brand-gradient rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="text-[52px] leading-none">{flagFor(code, code.includes("-"))}</span>
          <div>
            <h1 className="text-2xl font-black text-white">{title}</h1>
            {plans.length > 0 && <p className="text-white/80">from {money(from)}</p>}
          </div>
        </div>
      </div>

      <PlansList code={code} initialPlans={plans} />
    </ContentWidth>
  );
}
