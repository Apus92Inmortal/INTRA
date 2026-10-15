import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/auth-flows";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") return [];

  const siteUrl = getPublicAppUrl();
  return ["/", "/legal/terms-conditions", "/legal/privacy-policy"].map((path) => ({
    url: `${siteUrl}${path}`,
  }));
}
