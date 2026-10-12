import { ProductCategories } from "@/components/product-categories";
import Image from "next/image";
import { publicLocations } from "@/lib/public-content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { pages, articles, services, locations } from "@/lib/content";
import { ui, t, type Locale } from "@/lib/i18n";
import { Quote, Tracking } from "@/components/quote";
import { CTA } from "@/components/home";
import { Network, Journey } from "@/components/navigator";
import { uploadsReady } from "@/lib/enquiries";
import { published } from "@/lib/store";
import { metadataFor } from "@/lib/seo";
function title(slug: string, l: Locale) {
  return (
    pages.find((p) => p.slug === slug)?.title[l] ||
    {
      quote: ui.quote,
      contact: ui.contact,
      tracking: ui.track,
      insights: ui.insights,
    }[slug as "quote"]?.[l] ||
    articles.find((a) => `insights/${a.slug}` === slug)?.title[l] ||
    "BLIES"
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  const key = slug.join("/"),
    base = pages.find((p) => p.slug === key);
  const kind = key.startsWith("fleet/")
    ? "fleet"
    : key.startsWith("insights/")
      ? "article"
      : base?.group === "industries"
        ? "industry"
        : "service";
  const override = published(kind, key)[0]?.data;
  return metadataFor(
    locale,
    key,
    override?.title[locale] || title(key, locale),
    override?.metaDescription?.[locale] ||
      override?.intro[locale] ||
      base?.intro[locale],
  );
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string[] }>;
  searchParams: Promise<{ service?: string; category?: string }>;
}) {
  const { locale: l, slug: parts } = await params,
    slug = parts.join("/");
  const breadcrumb = (
    <nav
      className="breadcrumbs"
      aria-label={t("Breadcrumb", "Fil d’Ariane", "مسار التنقل")[l]}
    >
      <Link href={`/${l}`}>{ui.home[l]}</Link>
      <span>/</span>
      <span>{title(slug, l)}</span>
    </nav>
  );
  if (slug === "quote")
    return (
      <div className="page-wrap">
        {breadcrumb}
        <Quote
          locale={l}
          initialService={(await searchParams).service || ""}
          initialCategory={(await searchParams).category || ""}
          uploads={uploadsReady()}
        />
      </div>
    );
  if (slug === "tracking")
    return (
      <div className="page-wrap">
        {breadcrumb}
        <section className="page-hero">
          <p className="eyebrow">GPS / BLIES</p>
          <h1>{ui.track[l]}</h1>
          <p>{ui.trackingIntro[l]}</p>
        </section>
        <Tracking locale={l} />
      </div>
    );
  if (slug === "contact") {
    const settings = published("settings")[0]?.data;
    return (
      <>
        <div className="page-wrap">
          {breadcrumb}
          <section className="page-hero">
            <p className="eyebrow">BLIES / {ui.contact[l]}</p>
            <h1>{t("Let’s connect.", "Entrons en contact.", "لنتواصل.")[l]}</h1>
            <p>
              {
                t(
                  "Headquarters: Atrium on 5th, Sandton, Johannesburg, South Africa.",
                  "Siège : Atrium on 5th, Sandton, Johannesburg, Afrique du Sud.",
                  "المقر: Atrium on 5th، ساندتون، جوهانسبرغ، جنوب أفريقيا.",
                )[l]
              }
            </p>
          </section>
          <div className="contact-grid">
            <section>
              <h2>{ui.contact[l]}</h2>
              <p>
                {settings?.corporateEmail ? (
                  <a href={`mailto:${settings.corporateEmail}`}>
                    {settings.corporateEmail}
                  </a>
                ) : (
                  <>
                    <span className="badge">
                      {
                        t(
                          "Development contact only",
                          "Contact de développement uniquement",
                          "تواصل للتطوير فقط",
                        )[l]
                      }
                    </span>
                    <br />
                    <a href="mailto:dediguelaclauda@gmail.com">
                      dediguelaclauda@gmail.com
                    </a>
                  </>
                )}
              </p>
              <a href={`tel:${settings?.phone || "+27632400693"}`} dir="ltr">
                {settings?.phone || "+27 63 240 0693"}
              </a>
              <p id="whatsapp">
                {settings?.whatsapp ? (
                  <a
                    className="text-link"
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                  >
                    WhatsApp
                    <ArrowUpRight />
                  </a>
                ) : (
                  ui.whatsapp[l]
                )}
              </p>
              <Link className="button" href={`/${l}/quote`}>
                {ui.quote[l]}
                <ArrowUpRight />
              </Link>
            </section>
            <section>
              <h2>{t("Our bases", "Nos bases", "قواعدنا")[l]}</h2>
              {locations.slice(0, 3).map((loc) => (
                <div key={loc.id} className="contact-location">
                  <h3>{loc.title[l]}</h3>
                  <p>{loc.description[l]}</p>
                </div>
              ))}
            </section>
          </div>
          <Network locale={l} locationsData={publicLocations()} />
        </div>
        <CTA locale={l} />
      </>
    );
  }
  if (slug === "insights")
    return (
      <div className="page-wrap">
        {breadcrumb}
        <section className="page-hero">
          <p className="eyebrow">BLIES / {ui.insights[l]}</p>
          <h1>
            {
              t(
                "Perspective for a connected world.",
                "Perspectives pour un monde connecté.",
                "رؤى لعالم متصل.",
              )[l]
            }
          </h1>
          <p>
            {
              t(
                "Practical editorial guidance on procurement, African trade, logistics and supply-chain coordination.",
                "Conseils éditoriaux sur achats, commerce africain, logistique et coordination.",
                "إرشادات تحريرية عملية للمشتريات والتجارة الأفريقية واللوجستيات وتنسيق سلسلة الإمداد.",
              )[l]
            }
          </p>
        </section>
        <div className="article-grid">
          {articles.map((a) => (
            <Link key={a.slug} href={`/${l}/insights/${a.slug}`}>
              <p className="eyebrow">{a.category[l]}</p>
              <h2>{a.title[l]}</h2>
              <p>{a.body[0][l]}</p>
              <ArrowUpRight />
            </Link>
          ))}
          {published("article").map((a) => (
            <Link key={a.id as string} href={`/${l}/${a.slug}`}>
              <p className="eyebrow">{a.data.category?.[l]}</p>
              <h2>{a.data.title[l]}</h2>
              <p>{a.data.intro[l]}</p>
              <ArrowUpRight />
            </Link>
          ))}
        </div>
      </div>
    );
  const article = articles.find((a) => `insights/${a.slug}` === slug);
  if (article)
    return (
      <div className="page-wrap narrow">
        {breadcrumb}
        <section className="page-hero">
          <p className="eyebrow">{article.category[l]}</p>
          <h1>{article.title[l]}</h1>
          <p>
            {
              t(
                "BLIES editorial · General guidance",
                "Rédaction BLIES · Conseils généraux",
                "تحرير BLIES · إرشاد عام",
              )[l]
            }{" "}
            ·{" "}
            <time dateTime="2026-10-12">
              {new Intl.DateTimeFormat(l, { dateStyle: "long" }).format(
                new Date("2026-10-12T12:00:00Z"),
              )}
            </time>
          </p>
        </section>
        {article.body.map((p, i) => (
          <p className="article-body" key={i}>
            {p[l]}
          </p>
        ))}
        <Link className="text-link" href={`/${l}/insights`}>
          {ui.insights[l]}
          <ArrowRight />
        </Link>
        <CTA locale={l} />
      </div>
    );
  if (["my-blies", "document-vault", "mode-recommender"].includes(slug))
    return (
      <div className="page-wrap">
        <section className="page-hero">
          <p className="eyebrow">{ui.future[l]}</p>
          <h1>
            {slug === "my-blies"
              ? "My BLIES"
              : slug === "document-vault"
                ? "Document Vault"
                : "Mode Recommender"}
          </h1>
          <p>{pages.find((p) => p.slug === "technology/roadmap")!.intro[l]}</p>
          <Link href={`/${l}/technology/roadmap`} className="button">
            {ui.roadmap[l]}
          </Link>
        </section>
      </div>
    );
  const base = pages.find((p) => p.slug === slug);
  const kind = slug.startsWith("fleet/")
    ? "fleet"
    : slug.startsWith("insights/")
      ? "article"
      : base?.group === "industries"
        ? "industry"
        : "service";
  const override = published(kind, slug)[0]?.data;
  const page = override
    ? {
        slug,
        group: base?.group || "company",
        title: override.title,
        intro: override.intro,
        points: override.points || [],
      }
    : base;
  if (!page) notFound();
  const related = pages
    .filter((p) => p.group === page.group && p.slug !== slug)
    .slice(0, 6);
  const selectedService =
    services.find((s) => s.slug === slug)?.id || "integrated";
  return (
    <>
      <div className="page-wrap">
        {breadcrumb}
        <section
          className={`page-hero ${slug === "logistics/cold-chain" ? "cold" : ""}`}
        >
          <p className="eyebrow">BLIES / {ui.explore[l]}</p>
          <h1>{page.title[l]}</h1>
          <p>{page.intro[l]}</p>
          {page.group === "legal" ? (
            <div className="warning">{ui.legalDraft[l]}</div>
          ) : (
            <Link
              className="button"
              href={`/${l}/quote?service=${selectedService}`}
            >
              {ui.quote[l]}
              <ArrowUpRight />
            </Link>
          )}
        </section>
        <>
          {override?.imageUrl && (
            <Image
              className="approved-media"
              src={override.imageUrl}
              alt={page.title[l]}
              width={1200}
              height={800}
              unoptimized
            />
          )}
          {override?.videoUrl && (
            <video
              className="approved-media"
              src={override.videoUrl}
              controls
              preload="metadata"
              aria-label={page.title[l]}
            />
          )}
        </>
        <section className="detail-points">
          {page.points.map(
            (point: { en: string; fr: string; ar: string }, i: number) => (
              <div key={i}>
                <span>0{i + 1}</span>
                <p>{point[l]}</p>
              </div>
            ),
          )}
        </section>
        {(slug === "procurement" || slug === "procurement/categories") && (
          <ProductCategories locale={l} />
        )}
        {slug === "fleet" && (
          <section className="fleet-public">
            <p>{ui.noFleet[l]}</p>
            {published("fleet").map((f) => (
              <Link
                className="fleet-card"
                key={f.id as string}
                href={`/${l}/${f.slug}`}
              >
                <h2>{f.data.title[l]}</h2>
                <p>{f.data.intro[l]}</p>
                <ArrowUpRight />
              </Link>
            ))}
          </section>
        )}
        {slug === "technology/gps" && (
          <Link className="button secondary" href={`/${l}/tracking`}>
            {ui.track[l]}
            <ArrowUpRight />
          </Link>
        )}
        {slug === "services/quality" && <Journey locale={l} />}
        <section className="related">
          <h2>{ui.explore[l]}</h2>
          <div className="related-grid">
            {related.map((p) => (
              <Link key={p.slug} href={`/${l}/${p.slug}`}>
                {p.title[l]}
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      {page.group !== "legal" && <CTA locale={l} />}
    </>
  );
}
