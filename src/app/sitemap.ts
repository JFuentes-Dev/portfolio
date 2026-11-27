import type { MetadataRoute } from "next";
import { siteConfig } from "@/content/site";
import { locales } from "@/i18n/config";

export const dynamic = "force-static";

// La landing, en cada idioma.
const paths = [""];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(locales.map((l) => [l, `${siteConfig.url}/${l}${path}`]));
    return locales.map((locale) => ({
      url: `${siteConfig.url}/${locale}${path}`,
      lastModified: new Date(),
      alternates: { languages },
    }));
  });
}
