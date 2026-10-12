import { Home } from "@/components/home";
import { type Locale } from "@/lib/i18n";
import { metadataFor } from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return metadataFor(
    locale,
    "",
    "BLIES | " +
      ({
        en: "The supply chain, handled.",
        fr: "La chaîne logistique, prise en charge.",
        ar: "سلسلة الإمداد، نتولاها.",
      }[locale] || "BLIES"),
  );
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <Home locale={locale} />;
}
