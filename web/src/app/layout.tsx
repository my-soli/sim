import type { Metadata, Viewport } from "next";
import { delius } from "./fonts";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SessionProvider } from "@/lib/session";
import { Brand } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL("https://e-sim-website-production.up.railway.app"),
  title: {
    default: `${Brand.name} — Travel eSIM data plans for over 190 destinations`,
    template: `%s — ${Brand.name}`,
  },
  description:
    "Get a travel eSIM in minutes. Buy mobile data plans for 190+ countries, pay by card or M-Pesa, and activate instantly with a QR code — no physical SIM swap, no roaming bill shock.",
  openGraph: {
    type: "website",
    siteName: Brand.name,
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f9ff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${delius.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <SessionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
