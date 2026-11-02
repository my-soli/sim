import type { Metadata } from "next";
import Link from "next/link";
import { ContentWidth } from "@/components/content-width";
import { Brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch for help with orders, installs, and payments.",
};

export default function ContactPage() {
  return (
    <ContentWidth max={820} className="py-6">
      <h1 className="text-[28px] font-black">Contact us</h1>
      <p className="mt-1 text-muted">We&apos;re happy to help with orders, installs and payments.</p>

      <div className="mt-6 rounded-2xl bg-outline/40 p-6">
        <div className="flex items-center gap-3">
          <span className="text-xl">✉️</span>
          <a href={`mailto:${Brand.supportEmail}`} className="font-bold break-all">
            {Brand.supportEmail}
          </a>
        </div>
        <p className="mt-3 text-muted">
          When you write, include your order reference and the email or phone number you signed in with so we can
          find your order quickly.
        </p>
        <a
          href={`mailto:${Brand.supportEmail}?subject=${encodeURIComponent("Support request")}`}
          className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-bold text-primary-ink"
        >
          Email support
        </a>
      </div>

      <p className="mt-6">
        Many questions are answered in our{" "}
        <Link href="/help" className="font-bold text-primary">
          Help centre →
        </Link>
      </p>
    </ContentWidth>
  );
}
