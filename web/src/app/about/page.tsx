import type { Metadata } from "next";
import { ContentWidth } from "@/components/content-width";
import { SectionHeading, InfoCard } from "@/components/ui";
import { Brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `About ${Brand.name}`,
  description: `About ${Brand.name} — eSIM data plans for travellers, paid by card or M-Pesa.`,
};

export default function AboutPage() {
  return (
    <ContentWidth max={820} className="py-6">
      <h1 className="text-[28px] font-black">About {Brand.name}</h1>
      <p className="mt-5 leading-relaxed text-muted">
        We make staying connected while travelling simple. {Brand.name} sells eSIM data plans so you can skip the
        airport SIM queue and the roaming bill, and get online the moment you land.
      </p>
      <p className="mt-4 leading-relaxed text-muted">
        We built our checkout around how people actually pay. That includes M-Pesa, so customers in East Africa can
        pay straight from their phones, alongside card payments.
      </p>
      <SectionHeading title="What we care about" />
      <div className="flex flex-wrap gap-4">
        <InfoCard icon="👁️" title="Clarity" body="Plain plan details and prices, with no fine-print surprises." width={260} />
        <InfoCard icon="⚡" title="Speed" body="From checkout to QR code in minutes, not days." width={260} />
        <InfoCard icon="🤝" title="Support" body="Real help when an install doesn't go to plan." width={260} />
      </div>
    </ContentWidth>
  );
}
