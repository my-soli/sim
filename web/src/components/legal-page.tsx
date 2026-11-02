import { ContentWidth } from "./content-width";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <ContentWidth max={820} className="py-6">
      <h1 className="text-[28px] font-black">{title}</h1>
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-red-50 p-3.5 text-red-900">
        <span>⚠️</span>
        <p className="font-semibold">DRAFT placeholder, not legal advice. Have a lawyer review and replace this before launch.</p>
      </div>
      {sections.map(([heading, body]) => (
        <div key={heading} className="mt-6">
          <p className="font-extrabold">{heading}</p>
          <p className="mt-1.5 leading-relaxed text-muted">{body}</p>
        </div>
      ))}
    </ContentWidth>
  );
}
