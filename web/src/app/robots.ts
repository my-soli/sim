import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/checkout/", "/orders/", "/esims"],
    },
    sitemap: "https://e-sim-bq2.pages.dev/sitemap.xml",
  };
}
