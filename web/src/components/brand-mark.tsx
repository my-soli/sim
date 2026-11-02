import Link from "next/link";
import { Brand } from "@/lib/brand";

// Wordmark only, no icon mark — matches how most eSIM brands (e.g. Holafly) brand themselves.
export function BrandMark() {
  return (
    <Link href="/" className="shrink-0">
      <span className="brand-gradient bg-clip-text text-2xl font-black tracking-tight text-transparent">
        {Brand.name}
      </span>
    </Link>
  );
}
