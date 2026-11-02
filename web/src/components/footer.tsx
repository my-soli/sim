import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { Brand } from "@/lib/brand";

// Computed once at build time (module scope), not inside the render path — Next.js's static
// prerendering flags a fresh Date() read during render as an "unstable value".
const FOOTER_YEAR = new Date().getFullYear();

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="w-44">
      <p className="text-sm font-extrabold mb-2.5">{title}</p>
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="block py-1.5 text-sm text-muted hover:text-ink">
          {label}
        </Link>
      ))}
    </div>
  );
}

function TrustChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-outline bg-surface px-2.5 py-1.5 text-xs text-muted">
      {label}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="mt-14 bg-outline/40">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-12">
        <div className="flex flex-wrap gap-10">
          <div className="w-full sm:w-70 max-w-full">
            <BrandMark />
            <p className="mt-3.5 text-sm text-muted">
              eSIM data plans for travellers. Pay by card or M-Pesa and get connected in minutes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <TrustChip label="Card" />
              <TrustChip label="M-Pesa" />
              <TrustChip label="Secure checkout" />
            </div>
          </div>
          <FooterCol
            title="Explore"
            links={[
              ["Destinations", "/destinations"],
              ["How it works", "/how-it-works"],
              ["Install guide", "/install"],
            ]}
          />
          <FooterCol
            title="Support"
            links={[
              ["Help centre", "/help"],
              ["Contact us", "/contact"],
              ["My eSIMs", "/esims"],
            ]}
          />
          <FooterCol title="Company" links={[["About", "/about"]]} />
        </div>
        <hr className="my-8 border-outline" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>
            © {FOOTER_YEAR} {Brand.name}. Your phone must be eSIM-compatible and carrier-unlocked.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
