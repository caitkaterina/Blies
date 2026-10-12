import type { Metadata } from "next";
import { locales, type Locale } from "./i18n";
export const siteUrl = () =>
  process.env.BLIES_SITE_URL || "http://localhost:3000";
export function metadataFor(
  locale: Locale,
  slug: string,
  title: string,
  description?: string,
): Metadata {
  const suffix = slug ? `/${slug}` : "";
  return {
    metadataBase: new URL(siteUrl()),
    title: `${title}${title.startsWith("BLIES") ? "" : " | BLIES"}`,
    description:
      description ||
      {
        en: "Integrated procurement, owned road transportation and partner-coordinated supply-chain services.",
        fr: "Approvisionnement intégré, transport routier détenu et services logistiques coordonnés.",
        ar: "مشتريات متكاملة ونقل بري مملوك وخدمات سلسلة إمداد منسقة مع الشركاء.",
      }[locale],
    alternates: {
      canonical: `/${locale}${suffix}`,
      languages: Object.fromEntries([
        ...locales.map((l) => [l, `/${l}${suffix}`]),
        ["x-default", `/en${suffix}`],
      ]),
    },
    robots:
      process.env.BLIES_LAUNCH_APPROVED === "true" && !slug.startsWith("legal")
        ? { index: true, follow: true }
        : { index: false, follow: false },
    openGraph: {
      title,
      locale: locale === "ar" ? "ar_AE" : locale === "fr" ? "fr_FR" : "en_ZA",
      siteName: "BLIES",
      type: "website",
    },
  };
}
