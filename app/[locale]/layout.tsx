import { published } from "@/lib/store";
import { siteUrl } from "@/lib/seo";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Header, Footer } from "@/components/shell";
import { Analytics } from "@/components/analytics";
import { locales, type Locale } from "@/lib/i18n";
import "../globals.css";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;
  const contact = published("settings")[0]?.data;
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html
      data-scroll-behavior="smooth"
      lang={l}
      dir={l === "ar" ? "rtl" : "ltr"}
    >
      <body>
        <a className="skip-link" href="#content">
          {l === "ar"
            ? "انتقل إلى المحتوى"
            : l === "fr"
              ? "Aller au contenu"
              : "Skip to content"}
        </a>
        <Header locale={l} />
        <main id="content">{children}</main>
        <Footer locale={l} contact={contact} />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "BLIES (Pty) Ltd",
              legalName: "BLIES (Pty) Ltd",
              description: "Business Logistics Imports Exports & Suppliers",
              foundingDate: "2012",
              url: siteUrl(),
              address: {
                "@type": "PostalAddress",
                streetAddress: "Atrium on 5th",
                addressLocality: "Sandton, Johannesburg",
                addressCountry: "ZA",
              },
            }).replace(/</g, "\\u003c"),
          }}
        />
        <Analytics
          locale={l}
          nonce={nonce}
          domain={process.env.BLIES_ANALYTICS_DOMAIN || ""}
        />
      </body>
    </html>
  );
}
