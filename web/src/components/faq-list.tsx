import type { Faq } from "@/lib/faqs";

// Native <details>/<summary> gives click-to-expand behaviour with zero JS, and — unlike a JS-driven
// accordion — the answer text is present in the server-rendered HTML from the start, which is better
// for SEO than hiding it behind client state.
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((f) => (
        <details key={f.q} className="group rounded-2xl border border-outline px-4 py-3">
          <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden flex items-center justify-between">
            {f.q}
            <span className="text-muted transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <p className="mt-2 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
