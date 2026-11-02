import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of service", robots: { index: false } };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      sections={[
        ["Using the service", "You must be old enough to enter a contract and use an eSIM-compatible, carrier-unlocked device."],
        ["Plans and delivery", "Each plan lists its data allowance and validity period. eSIM details are delivered digitally after payment is confirmed."],
        ["Payments and refunds", "Payments are processed by our payment partners. If we cannot deliver your eSIM you will be refunded. Other refund requests are handled case by case."],
        ["Acceptable use", "Do not use the service unlawfully or in a way that harms networks or other users."],
      ]}
    />
  );
}
