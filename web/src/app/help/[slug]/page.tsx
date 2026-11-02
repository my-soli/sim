import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentWidth } from "@/components/content-width";
import { SectionHeading } from "@/components/ui";
import { Brand } from "@/lib/brand";
import { helpArticles, minutesRead } from "@/lib/help-articles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = helpArticles.find((a) => a.slug === slug);
  if (!article) return {};
  return { title: article.title, description: article.excerpt };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = helpArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const related = helpArticles.filter((a) => a.category === article.category && a.slug !== article.slug).slice(0, 3);

  return (
    <ContentWidth max={780} className="py-6">
      <nav className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>{" "}
        ›{" "}
        <Link href="/help" className="hover:text-ink">
          Help
        </Link>{" "}
        › {article.category}
      </nav>

      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl">
          {article.icon}
        </span>
        <div>
          <p className="text-sm font-bold text-primary">{article.category}</p>
          <h1 className="text-2xl font-black">{article.title}</h1>
        </div>
      </div>
      <p className="ml-[58px] mt-1 text-sm text-muted">⏱ {minutesRead(article)} min read</p>

      <p className="mt-6 leading-relaxed text-muted">{article.intro}</p>
      {article.sections.map(([heading, body]) => (
        <div key={heading} className="mt-6">
          <p className="font-extrabold">{heading}</p>
          <p className="mt-1.5 leading-relaxed text-muted">{body}</p>
        </div>
      ))}

      <a
        href={`mailto:${Brand.supportEmail}?subject=${encodeURIComponent(`Question about: ${article.title}`)}`}
        className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 font-bold text-primary-ink"
      >
        ✉️ Still need help? Contact us
      </a>

      {related.length > 0 && (
        <>
          <SectionHeading title="Related articles" />
          <div className="flex flex-col gap-1">
            {related.map((a) => (
              <Link key={a.slug} href={`/help/${a.slug}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-outline/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-outline/60 text-base">{a.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold">{a.title}</span>
                  <span className="block truncate text-sm text-muted">{a.excerpt}</span>
                </span>
                <span className="text-muted">›</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </ContentWidth>
  );
}
