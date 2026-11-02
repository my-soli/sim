"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeading } from "@/components/ui";
import { FaqList } from "@/components/faq-list";
import { allFaqs } from "@/lib/faqs";
import { helpArticles, helpCategories, minutesRead } from "@/lib/help-articles";

export default function HelpCenterPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const articles = helpArticles.filter((a) => {
    const matchesCategory = category === null || a.category === category;
    const matchesQuery = !query || a.title.toLowerCase().includes(query) || a.excerpt.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  const filteredFaqs = !query ? allFaqs : allFaqs.filter((f) => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query));
  const faqGroups = Array.from(new Set(filteredFaqs.map((f) => f.group)));

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-8 py-6">
      <h1 className="text-[28px] font-black">Help centre</h1>
      <p className="mt-1 text-muted">Browse articles by topic, or jump straight to a quick answer below.</p>

      <div className="mt-6 flex items-center gap-2 rounded-full border border-outline bg-surface px-4 py-1 max-w-[560px]">
        <span aria-hidden>🔎</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search help articles and FAQs"
          className="flex-1 bg-transparent py-2.5 outline-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${category === null ? "bg-primary text-primary-ink" : "border border-outline"}`}
        >
          All topics
        </button>
        {helpCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(category === c ? null : c)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${category === c ? "bg-primary text-primary-ink" : "border border-outline"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {articles.length === 0 && query ? (
        <p className="mt-6 text-muted">No articles match &quot;{q.trim()}&quot;. Try the FAQs below, or contact us.</p>
      ) : (
        <>
          <SectionHeading title="Articles" />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/help/${a.slug}`}
                className="flex flex-col rounded-2xl border border-outline bg-surface p-4.5 hover:border-primary"
                style={{ minHeight: 190 }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-lg">{a.icon}</span>
                  <span className="rounded-full bg-outline/60 px-2.5 py-1 text-xs">{a.category}</span>
                </div>
                <p className="mt-3 font-extrabold leading-snug">{a.title}</p>
                <p className="mt-1 flex-1 text-sm text-muted line-clamp-2">{a.excerpt}</p>
                <p className="mt-2 text-xs text-muted">⏱ {minutesRead(a)} min read</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {(!query || filteredFaqs.length > 0) && (
        <>
          <SectionHeading title="Quick answers" subtitle="Tap a question to expand it." />
          {faqGroups.map((g) => (
            <div key={g} className="mb-6">
              <p className="mb-2 mt-4 font-extrabold">{g}</p>
              <FaqList items={filteredFaqs.filter((f) => f.group === g)} />
            </div>
          ))}
        </>
      )}

      <SectionHeading title="Still stuck?" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex-1 text-muted">Our support team can help with orders, installs and payments.</p>
        <Link href="/contact" className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-ink">
          Contact us
        </Link>
      </div>
    </div>
  );
}
