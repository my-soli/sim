import type { Metadata } from "next";
import Link from "next/link";
import { ContentWidth } from "@/components/content-width";
import { SectionHeading, InfoCard } from "@/components/ui";
import { Brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `How ${Brand.name} works`,
  description: "Get travel data without a physical SIM, roaming bills, or shop visits — in six simple steps.",
};

export default function HowItWorksPage() {
  return (
    <ContentWidth max={1080} className="py-6">
      <h1 className="text-[28px] font-black">How {Brand.name} works</h1>
      <p className="mt-1 text-muted">Get travel data without a physical SIM, roaming bills or shop visits.</p>

      <div className="mt-8 flex flex-wrap gap-4">
        <InfoCard icon="🧭" title="1. Choose your plan" body="Search your destination, compare data amounts and validity, and pick a plan." width={340} />
        <InfoCard icon="🔒" title="2. Pay securely" body="Pay by card, or with M-Pesa: enter your number and approve the prompt on your phone." width={340} />
        <InfoCard icon="📷" title="3. Get your QR code" body="Your QR code and manual activation details appear right after payment and stay in My eSIMs." width={340} />
        <InfoCard icon="⬇️" title="4. Install on your phone" body="Scan the QR (or enter the details manually) from your phone's eSIM settings." width={340} />
        <InfoCard icon="🌍" title="5. Connect on arrival" body="Switch the eSIM on and enable data roaming for it when you land." width={340} />
        <InfoCard icon="➕" title="6. Top up if you need" body="Running low? Buy more data for the same destination from My eSIMs." width={340} />
      </div>

      <SectionHeading title="Before you buy" />
      <p className="text-muted">
        Make sure your phone supports eSIM and is carrier-unlocked. You can usually check under Settings › About
        (look for an &quot;EID&quot; or &quot;Digital SIM&quot;), or on your manufacturer&apos;s website.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/destinations" className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-ink">
          Browse destinations
        </Link>
        <Link href="/install" className="rounded-full border border-outline px-5 py-2.5 font-bold">
          Read the install guide
        </Link>
      </div>
    </ContentWidth>
  );
}
