import { published } from "@/lib/store";
import { type MetadataRoute } from "next";
import { pages, articles } from "@/lib/content";
import { locales } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const custom = [
    ...published("service"),
    ...published("industry"),
    ...published("fleet"),
    ...published("article"),
  ].map((row) =>
    row.kind === "article" && !row.slug.startsWith("insights/")
      ? `insights/${row.slug}`
      : row.slug,
  );
  return [
    ...new Set([
      "",
      ...pages.filter((p) => p.group !== "legal").map((p) => p.slug),
      "quote",
      "contact",
      "tracking",
      "insights",
      ...articles.map((a) => `insights/${a.slug}`),
      ...custom,
    ]),
  ].flatMap((slug) =>
    locales.map((l) => ({
      url: `${siteUrl()}/${l}${slug ? "/" + slug : ""}`,
      alternates: {
        languages: Object.fromEntries(
          locales.map((lang) => [
            lang,
            `${siteUrl()}/${lang}${slug ? "/" + slug : ""}`,
          ]),
        ),
      },
    })),
  );
}
