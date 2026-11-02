import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy", robots: { index: false } };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      sections={[
        ["What we collect", "Your email or phone number for sign-in, your orders, and technical data needed to run the service."],
        ["How we use it", "To deliver your eSIM, process payments, send order and usage notifications, and provide support."],
        ["Sharing", "We share the minimum necessary data with our eSIM supplier and payment processors to fulfil your order."],
        ["Your choices", "You can contact us to access or delete your data, subject to legal obligations."],
      ]}
    />
  );
}
