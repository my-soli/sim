import type { MetadataRoute } from "next";
import { getCountries } from "@/lib/catalog";
import { helpArticles } from "@/lib/help-articles";

const BASE = "https://e-sim-bq2.pages.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/destinations`, priority: 0.9 },
    { url: `${BASE}/how-it-works`, priority: 0.7 },
    { url: `${BASE}/install`, priority: 0.6 },
    { url: `${BASE}/help`, priority: 0.6 },
    { url: `${BASE}/about`, priority: 0.4 },
    { url: `${BASE}/contact`, priority: 0.4 },
  ];

  // Real per-destination and per-article pages, not just the marketing shell.
  const countries = await getCountries().catch(() => []);
  const countryPages: MetadataRoute.Sitemap = countries.map((c) => ({
    url: `${BASE}/country/${c.code}`,
    priority: c.popular ? 0.8 : 0.6,
  }));
  const articlePages: MetadataRoute.Sitemap = helpArticles.map((a) => ({
    url: `${BASE}/help/${a.slug}`,
    priority: 0.5,
  }));

  return [...staticPages, ...countryPages, ...articlePages];
}
