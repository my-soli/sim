import type { Metadata } from "next";
import { ContentWidth } from "@/components/content-width";
import { SectionHeading } from "@/components/ui";
import { PopularGrid, CountryGrid } from "@/components/destinations";
import { getCountries } from "@/lib/catalog";
import { DestinationsSearch } from "./search";

export const metadata: Metadata = {
  title: "Find your destination",
  description: "Search eSIM data plans by country or region, then pick the plan that suits your trip.",
};

// Live catalog data: always render fresh, never freeze a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const countries = await getCountries();
  const query = q.trim().toLowerCase();
  const matches = query
    ? countries.filter((c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase() === query)
    : [];

  return (
    <ContentWidth max={1080} className="py-6">
      <h1 className="text-[28px] font-black">Find your destination</h1>
      <p className="mt-1 text-muted">Search by country or region, then pick the data plan that suits your trip.</p>

      <div className="mt-6 max-w-[560px]">
        <DestinationsSearch initialQuery={q} />
      </div>

      {query ? (
        <>
          <SectionHeading title={`${matches.length} result${matches.length === 1 ? "" : "s"} for "${q.trim()}"`} />
          <CountryGrid countries={matches} />
        </>
      ) : (
        <>
          <SectionHeading title="Popular destinations" />
          <PopularGrid countries={countries.filter((c) => c.popular)} />
          <SectionHeading title="All countries" />
          <CountryGrid countries={countries.filter((c) => !c.isRegional)} />
          <SectionHeading title="Regional plans" subtitle="One plan that works across several countries." />
          <CountryGrid countries={countries.filter((c) => c.isRegional)} />
        </>
      )}
    </ContentWidth>
  );
}
