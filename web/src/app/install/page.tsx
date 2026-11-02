import type { Metadata } from "next";
import { ContentWidth } from "@/components/content-width";
import { OsToggle } from "./os-toggle";

export const metadata: Metadata = {
  title: "How to install your eSIM",
  description: "Step-by-step eSIM install instructions for iPhone and Android.",
};

export default function InstallPage() {
  return (
    <ContentWidth max={720} className="py-6">
      <nav className="text-sm text-muted mb-4 text-center">Home › How it works › Install guide</nav>
      <h1 className="text-center text-[28px] font-black">How to install your eSIM</h1>
      <div className="mt-6">
        <OsToggle />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Tip: install while you have Wi-Fi, and switch the eSIM on when you arrive at your destination.
      </p>
    </ContentWidth>
  );
}
