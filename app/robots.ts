import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/auth-flows";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api", "/auth", "/login", "/register", "/verify-email"],
    },
    sitemap: `${getPublicAppUrl()}/sitemap.xml`,
  };
}
