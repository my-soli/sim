import Link from "next/link";
import { ContentWidth } from "@/components/content-width";
import { HeroSearch } from "@/components/hero-search";
import { PopularGrid } from "@/components/destinations";
import { SectionHeading, InfoCard } from "@/components/ui";
import { FaqList } from "@/components/faq-list";
import { allFaqs } from "@/lib/faqs";
import { getCountries } from "@/lib/catalog";
import { flagFor, money } from "@/lib/format";
import { Brand } from "@/lib/brand";

// Fetches live catalog data with no other dynamic trigger (no searchParams/cookies), so without
// this it gets frozen as a static snapshot at build time instead of re-fetching per request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const countries = await getCountries();
  const popular = countries.filter((c) => c.popular);
  const totalPlans = countries.reduce((sum, c) => sum + c.planCount, 0);

  return (
    <>
      <div className="bg-ink py-2 text-center text-sm font-semibold text-white">
        🔒 Secure checkout · Card and M-Pesa accepted · Your eSIM stays installed for future trips
      </div>

      <section className="brand-gradient w-full">
        <ContentWidth max={1200} className="flex flex-col gap-10 py-10 sm:py-16 lg:flex-row lg:items-center lg:py-24">
          <div className="flex-1">
            <h1 className="text-[34px] font-black leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[56px]">
              Travel data,
              <br />
              sorted before
              <br />
              you land.
            </h1>
            <p className="mt-4 max-w-md text-[15px] text-white/90 sm:text-lg">
              eSIM data plans for travellers. No roaming fees, no SIM swapping. Scan a QR code and you&apos;re online.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-white/90">
              <span>✓ No roaming fees</span>
              <span>✓ Fast activation</span>
              <span>✓ Keep your own number</span>
              <span>✓ {countries.length}+ destinations</span>
            </div>
            <div className="mt-7">
              <HeroSearch />
            </div>
          </div>
          <div className="flex-1 max-w-sm">
            {popular.slice(0, 3).map((c) => (
              <Link
                key={c.code}
                href={`/country/${c.code}`}
                className="mb-3 flex items-center gap-3.5 rounded-[18px] border border-white/25 bg-white/15 p-4 last:mb-0"
              >
                <span className="text-[34px]">{flagFor(c.code)}</span>
                <span className="flex-1">
                  <span className="block font-extrabold text-white">{c.name}</span>
                  <span className="block text-white/80">{c.planCount} plans</span>
                </span>
                <span className="font-extrabold text-white">from {money(c.fromPriceCents)}</span>
              </Link>
            ))}
          </div>
        </ContentWidth>
      </section>

      {/* Real, live numbers from our own catalog — not fabricated social proof. */}
      <div className="border-b border-outline bg-surface py-6">
        <ContentWidth max={1200} className="flex flex-wrap justify-around gap-6 text-center">
          <div>
            <p className="text-2xl font-black text-primary">{countries.length}+</p>
            <p className="text-sm text-muted">Destinations covered</p>
          </div>
          <div>
            <p className="text-2xl font-black text-primary">{totalPlans}+</p>
            <p className="text-sm text-muted">Data plans live right now</p>
          </div>
          <div>
            <p className="text-2xl font-black text-primary">2</p>
            <p className="text-sm text-muted">Ways to pay — card or M-Pesa</p>
          </div>
          <div>
            <p className="text-2xl font-black text-primary">~Minutes</p>
            <p className="text-sm text-muted">From payment to QR code</p>
          </div>
        </ContentWidth>
      </div>

      <ContentWidth max={1200}>
        <div className="flex flex-wrap gap-7 pt-7">
          {[
            "⚡ Delivered in minutes",
            "🔒 Secure card & M-Pesa payments",
            "📡 No roaming fees",
            "🎧 Install guides for iPhone & Android",
          ].map((item) => (
            <span key={item} className="font-semibold">
              {item}
            </span>
          ))}
        </div>

        <SectionHeading
          title="Popular destinations"
          subtitle="Most-loved by travellers, ready in minutes."
          action={
            <Link href="/destinations" className="font-bold text-primary">
              See all →
            </Link>
          }
        />
        <PopularGrid countries={popular} />

        {/* "What is an eSIM?" explainer, aimed at first-time buyers who don't know the term yet. */}
        <div className="flex flex-wrap items-center gap-10 rounded-3xl bg-outline/40 p-8 mt-14">
          <div className="flex-1 min-w-[260px]">
            <p className="text-sm font-black uppercase tracking-wide text-primary">New to eSIM?</p>
            <h2 className="mt-1.5 text-2xl font-black">What is an eSIM?</h2>
            <p className="mt-2 text-muted">
              An eSIM is a SIM built into your phone — no plastic card to swap. Scan a QR code and your data plan
              is installed in seconds.
            </p>
            <Link href="/help/what-is-an-esim" className="mt-3 inline-block font-bold text-primary">
              More details →
            </Link>
          </div>
          <div className="flex flex-1 min-w-[260px] gap-6 text-center">
            {["No plastic card", "No store visit", "No SIM swap"].map((t) => (
              <div key={t} className="flex-1">
                <p className="text-3xl">✓</p>
                <p className="mt-1 text-sm font-bold">{t}</p>
              </div>
            ))}
          </div>
        </div>

        <SectionHeading title="How it works" subtitle="From checkout to connected in three steps." />
        <div className="flex flex-wrap gap-4">
          <InfoCard icon="🧭" title="1. Pick a destination" body="Choose a country or region and the data plan that fits your trip." width={380} />
          <InfoCard icon="🔒" title="2. Pay securely" body="Pay by card, or with M-Pesa: approve the prompt on your phone." width={380} />
          <InfoCard icon="📷" title="3. Scan & connect" body="Scan the QR code on your phone and switch on data when you land." width={380} />
        </div>
        <Link href="/install" className="mt-2 inline-block text-sm font-bold text-primary">
          Not sure your phone supports eSIM? Check compatibility →
        </Link>

        <SectionHeading title={`Why travellers choose ${Brand.name}`} />
        <div className="flex flex-wrap gap-4">
          <InfoCard icon="📱" title="Keep your number" body="Your regular SIM stays active. Add a data eSIM alongside it." />
          <InfoCard icon="🏷️" title="Clear pricing" body="The price you see is the price you pay. No roaming surprises." />
          <InfoCard icon="💳" title="Pay your way" body="Card via Stripe or M-Pesa, right from your phone." />
          <InfoCard icon="📊" title="Track your data" body="See what's left and when each plan expires in My eSIMs." />
          <InfoCard icon="🌍" title="Wide coverage" body={`${countries.length}+ destinations, from single countries to full regions.`} />
          <InfoCard icon="♻️" title="Less plastic" body="No physical SIM card means less packaging and plastic waste per trip." />
        </div>
        <p className="mt-4 text-xs text-muted">
          Connectivity depends on local network coverage and your device&apos;s eSIM support — see the install guide
          to check compatibility before you buy.
        </p>

        <SectionHeading
          title="Questions? We've got answers"
          action={
            <Link href="/help" className="font-bold text-primary">
              All FAQs →
            </Link>
          }
        />
        <FaqList items={allFaqs.slice(0, 4)} />

        <div className="brand-gradient my-12 flex flex-wrap items-center justify-between gap-6 rounded-3xl p-8">
          <div>
            <p className="text-2xl font-black text-white">Ready for your next trip?</p>
            <p className="mt-1.5 text-white/70">Find a plan for your destination in seconds.</p>
          </div>
          <Link href="/destinations" className="rounded-full bg-white px-7 py-4.5 font-bold text-ink">
            Browse destinations
          </Link>
        </div>
      </ContentWidth>
    </>
  );
}
