import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  PackageSearch,
  Truck,
  Workflow,
  ShieldCheck,
  Navigation,
} from "lucide-react";
import { t, ui, type Locale } from "@/lib/i18n";
import { pages } from "@/lib/content";
import { publicLocations } from "@/lib/public-content";
import { ServiceNavigator, Network, Journey } from "./navigator";
export function CTA({ locale: l }: { locale: Locale }) {
  return (
    <section className="cta">
      <div>
        <p className="eyebrow">
          {
            t(
              "LET’S CONNECT THE DETAILS",
              "RELIER LES DÉTAILS",
              "لنربط التفاصيل",
            )[l]
          }
        </p>
        <h2>
          {
            t(
              "Your quote, without the wait.",
              "Votre devis, sans attendre.",
              "عرض سعرك، دون انتظار.",
            )[l]
          }
        </h2>
        <p>{ui.turnaround[l]}</p>
      </div>
      <Link className="button light" href={`/${l}/quote`}>
        {ui.quote[l]}
        <ArrowUpRight />
      </Link>
    </section>
  );
}
export function Home({ locale: l }: { locale: Locale }) {
  const pillars = [
    {
      icon: PackageSearch,
      title: ui.procurement,
      body: t(
        "From supplier identification to the right product, price and specifications.",
        "De l’identification du fournisseur au bon produit, prix et spécifications.",
        "من تحديد المورد إلى المنتج والسعر والمواصفات المناسبة.",
      ),
      href: "procurement",
    },
    {
      icon: Truck,
      title: ui.logistics,
      body: t(
        "Owned road transport. Sea and air freight coordinated through partners.",
        "Transport routier détenu. Fret maritime et aérien coordonné via partenaires.",
        "نقل بري مملوك. شحن بحري وجوي منسق عبر الشركاء.",
      ),
      href: "logistics",
    },
    {
      icon: Workflow,
      title: t(
        "Integrated supply chain",
        "Chaîne logistique intégrée",
        "سلسلة إمداد متكاملة",
      ),
      body: t(
        "Procurement, inspection, documents, clearance and delivery. One partner.",
        "Achats, inspection, documents, dédouanement et livraison. Un partenaire.",
        "مشتريات وفحص ومستندات وتخليص وتسليم. شريك واحد.",
      ),
      href: "services/quality",
    },
  ];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            {
              t(
                "BLIES / BUSINESS LOGISTICS IMPORTS EXPORTS & SUPPLIERS",
                "BLIES / BUSINESS LOGISTICS IMPORTS EXPORTS & SUPPLIERS",
                "BLIES / BUSINESS LOGISTICS IMPORTS EXPORTS & SUPPLIERS",
              )[l]
            }
          </p>
          <h1>
            {
              t(
                "The supply chain, handled.",
                "La chaîne logistique, prise en charge.",
                "سلسلة الإمداد، نتولاها.",
              )[l]
            }
          </h1>
          <p className="hero-subtitle">
            {
              t(
                "Global procurement and logistics connecting Africa to the world’s leading markets.",
                "Approvisionnement et logistique mondiaux reliant l’Afrique aux principaux marchés internationaux.",
                "مشتريات وخدمات لوجستية عالمية تربط أفريقيا بالأسواق الرائدة في العالم.",
              )[l]
            }
          </p>
          <div className="hero-actions">
            <Link className="button" href={`/${l}/quote`}>
              {ui.quote[l]}
              <ArrowUpRight size={20} />
            </Link>
            <Link className="text-link" href="#services">
              {ui.explore[l]}
              <ArrowRight size={20} />
            </Link>
          </div>
          <div className="hero-foot">
            <span>{t("EST. 2012", "DEPUIS 2012", "تأسست 2012")[l]}</span>
            <span>
              {
                t(
                  "SOUTH AFRICA · GABON · UAE",
                  "AFRIQUE DU SUD · GABON · EAU",
                  "جنوب أفريقيا · الغابون · الإمارات",
                )[l]
              }
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="container-stack">
            <div className="container c1">
              <span>BLIES</span>
              <small>PROCURE / CONNECT / DELIVER</small>
            </div>
            <div className="container c2" />
            <div className="container c3" />
            <div className="container c4" />
          </div>
          <div className="art-orbit" />
          <div className="art-coordinates">
            26°06′ S / 28°03′ E<br />
            JOHANNESBURG → GLOBAL
          </div>
          <span className="art-label">
            {
              t(
                "REPRESENTATIVE SUPPLY-CHAIN COMPOSITION",
                "COMPOSITION LOGISTIQUE REPRÉSENTATIVE",
                "تصميم تمثيلي لسلسلة الإمداد",
              )[l]
            }
          </span>
        </div>
      </section>
      <section className="pillars">
        {pillars.map((p, i) => (
          <Link href={`/${l}/${p.href}`} key={p.href}>
            <div className="pillar-top">
              <p.icon size={28} />
              <span>0{i + 1}</span>
            </div>
            <h2>{p.title[l]}</h2>
            <p>{p.body[l]}</p>
            <ArrowUpRight size={22} />
          </Link>
        ))}
      </section>
      <ServiceNavigator locale={l} />
      <Journey locale={l} />
      <Network locale={l} locationsData={publicLocations()} />
      <section className="fleet-feature section">
        <div className="fleet-graphic" aria-hidden="true">
          <Truck strokeWidth={0.65} />
          <span>
            {
              t(
                "OWNED ROAD FLEET",
                "FLOTTE ROUTIÈRE DÉTENUE",
                "أسطول بري مملوك",
              )[l]
            }
          </span>
        </div>
        <div>
          <p className="eyebrow">
            {
              t(
                "03 / OUR ROAD CAPABILITY",
                "03 / CAPACITÉ ROUTIÈRE",
                "03 / قدراتنا البرية",
              )[l]
            }
          </p>
          <h2>{pages.find((p) => p.slug === "fleet")!.title[l]}</h2>
          <p>{ui.noFleet[l]}</p>
          <Link className="text-link" href={`/${l}/fleet`}>
            {ui.fleet[l]}
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="section industries">
        <p className="eyebrow">
          {
            t(
              "04 / INDUSTRIES WE SUPPORT",
              "04 / SECTEURS ACCOMPAGNÉS",
              "04 / القطاعات التي ندعمها",
            )[l]
          }
        </p>
        <h2>
          {
            t(
              "Industrial understanding. Practical coordination.",
              "Compréhension industrielle. Coordination concrète.",
              "فهم صناعي. تنسيق عملي.",
            )[l]
          }
        </h2>
        <div className="industry-grid">
          {pages
            .filter((p) => p.group === "industries")
            .map((p, i) => (
              <Link key={p.slug} href={`/${l}/${p.slug}`}>
                <span>0{i + 1}</span>
                <h3>{p.title[l]}</h3>
                <ArrowUpRight />
              </Link>
            ))}
        </div>
      </section>
      <section className="assurance section">
        <div>
          <ShieldCheck size={40} />
          <h2>{pages.find((p) => p.slug === "services/quality")!.title[l]}</h2>
          <p>
            {
              t(
                "Supplier assessment, relevant inspections and delivery verification. Documentation connects each stage to the next.",
                "Évaluation fournisseurs, inspections pertinentes et vérification de livraison. La documentation relie chaque étape.",
                "تقييم الموردين والفحوص المناسبة والتحقق من التسليم. تربط المستندات كل مرحلة بالتالية.",
              )[l]
            }
          </p>
          <Link className="text-link" href={`/${l}/services/quality`}>
            {ui.trust[l]}
            <ArrowUpRight />
          </Link>
        </div>
        <div>
          <Navigation size={40} />
          <h2>
            {
              t(
                "Visibility on the road.",
                "Visibilité sur la route.",
                "رؤية على الطريق.",
              )[l]
            }
          </h2>
          <p>{ui.trackingIntro[l]}</p>
          <Link className="text-link" href={`/${l}/tracking`}>
            {ui.track[l]}
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="section roadmap-preview">
        <div>
          <p className="eyebrow">{ui.future[l]}</p>
          <h2>
            {
              t(
                "A considered digital future.",
                "Un avenir numérique réfléchi.",
                "مستقبل رقمي مدروس.",
              )[l]
            }
          </h2>
        </div>
        <div>
          <p>
            {
              t(
                "My BLIES. Document Vault. Mode Recommender. A roadmap for better access and visibility — not live products.",
                "My BLIES. Document Vault. Mode Recommender. Une feuille de route pour l’accès et la visibilité — produits non disponibles.",
                "My BLIES. خزنة المستندات. موصي وسيلة النقل. خارطة طريق لوصول ورؤية أفضل — ليست منتجات متاحة.",
              )[l]
            }
          </p>
          <Link className="text-link" href={`/${l}/technology/roadmap`}>
            {ui.roadmap[l]}
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <CTA locale={l} />
    </>
  );
}
