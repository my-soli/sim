import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Browse help articles and FAQs about eSIM activation, payments, and usage.",
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
