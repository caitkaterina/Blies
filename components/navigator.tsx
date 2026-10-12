"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { services, locations, journey } from "@/lib/content";
import { t, ui, type Locale } from "@/lib/i18n";
export function ServiceNavigator({ locale: l }: { locale: Locale }) {
  const [selected, setSelected] = useState(services[0]);
  return (
    <section id="services" className="section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {
              t(
                "01 / YOUR NEXT MOVE",
                "01 / VOTRE PROCHAINE ÉTAPE",
                "01 / خطوتك التالية",
              )[l]
            }
          </p>
          <h2>
            {
              t(
                "What are you looking for?",
                "Que recherchez-vous ?",
                "ما الذي تبحث عنه؟",
              )[l]
            }
          </h2>
        </div>
        <p>
          {
            t(
              "Start with your need. We’ll connect the details.",
              "Partez de votre besoin. Nous relierons les détails.",
              "ابدأ باحتياجك. سنتولى ربط التفاصيل.",
            )[l]
          }
        </p>
      </div>
      <div className="navigator">
        <div
          className="service-options"
          role="group"
          aria-label={ui.explore[l]}
        >
          {services.slice(0, 11).map((s, i) => (
            <button
              key={s.id}
              aria-pressed={s.id === selected.id}
              onClick={() => setSelected(s)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s.title[l]}
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
        <div className="service-result" aria-live="polite">
          <span className="eyebrow">
            BLIES / {ui.procurement[l]} + {ui.logistics[l]}
          </span>
          <h3>{selected.title[l]}</h3>
          <p>
            {
              t(
                "A considered route from your requirement to the right service. Explore the capability or start an enquiry with your selection already filled in.",
                "Un parcours réfléchi vers le bon service. Explorez les capacités ou commencez une demande avec votre sélection préremplie.",
                "مسار مدروس من احتياجك إلى الخدمة المناسبة. استكشف القدرات أو ابدأ استفسارًا مع تعبئة اختيارك مسبقًا.",
              )[l]
            }
          </p>
          <Link href={`/${l}/${selected.slug}`} className="text-link">
            {ui.read[l]}
            <ArrowRight size={18} />
          </Link>
          <Link
            className="button light"
            href={`/${l}/quote?service=${selected.id}`}
          >
            {ui.quote[l]}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function Network({
  locale: l,
  locationsData = locations,
}: {
  locale: Locale;
  locationsData?: typeof locations;
}) {
  const [selected, setSelected] = useState(locationsData[0]);
  return (
    <section className="section network">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {
              t(
                "02 / CONNECTED MARKETS",
                "02 / MARCHÉS CONNECTÉS",
                "02 / أسواق متصلة",
              )[l]
            }
          </p>
          <h2>
            {
              t(
                "Rooted in Africa. Connected globally.",
                "Ancrés en Afrique. Connectés au monde.",
                "جذور أفريقية. اتصال عالمي.",
              )[l]
            }
          </h2>
        </div>
        <p>
          {
            t(
              "Bases, operating reach and sourcing markets. Every location has a distinct role.",
              "Bases, portée opérationnelle et marchés de sourcing. Chaque lieu a un rôle distinct.",
              "قواعد ونطاق تشغيل وأسواق توريد. لكل موقع دور محدد.",
            )[l]
          }
        </p>
      </div>
      <div className="map-grid">
        <div className="map" aria-label={ui.contact[l]}>
          <svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="grid"
                width="5"
                height="5"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 5 0 L 0 0 0 5"
                  fill="none"
                  stroke="#224564"
                  strokeWidth=".12"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            <g fill="#315470">
              <path d="M8 18 21 12 33 17 37 28 29 36 23 43 16 35 11 30Z M25 45 35 46 39 57 34 72 30 86 25 67Z M46 23 55 17 64 23 66 31 57 37 48 33Z M45 39 58 37 63 49 60 67 53 82 47 68 41 50Z M62 23 73 15 90 22 94 35 85 40 84 56 77 58 73 48 66 42Z M82 71 91 70 97 79 94 87 84 86Z" />
            </g>
            <g
              fill="none"
              stroke="#84b9d8"
              strokeWidth=".3"
              strokeDasharray="1 1"
            >
              {locationsData.slice(1).map((loc) => (
                <path key={loc.id} d={`M54 77 Q65 25 ${loc.x} ${loc.y}`} />
              ))}
            </g>
          </svg>
          {locationsData.map((loc) => (
            <button
              key={loc.id}
              className={`map-marker ${selected.id === loc.id ? "selected" : ""}`}
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              aria-label={`${loc.title[l]} — ${loc.role[l]}`}
              aria-pressed={selected.id === loc.id}
              onClick={() => setSelected(loc)}
            >
              <span />
            </button>
          ))}
          <span className="map-caption">
            {
              t(
                "Schematic geographic overview",
                "Vue géographique schématique",
                "نظرة جغرافية تخطيطية",
              )[l]
            }
          </span>
        </div>
        <div className="location-detail" aria-live="polite">
          <p className="eyebrow">{selected.role[l]}</p>
          <h3>{selected.title[l]}</h3>
          <p>{selected.description[l]}</p>
          <div className="location-select">
            <label htmlFor="market">
              {t("Explore a market", "Explorer un marché", "استكشف سوقًا")[l]}
            </label>
            <select
              id="market"
              value={selected.id}
              onChange={(e) =>
                setSelected(locationsData.find((x) => x.id === e.target.value)!)
              }
            >
              {locationsData.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.title[l]} — {loc.role[l]}
                </option>
              ))}
            </select>
          </div>
          <Link href={`/${l}/contact`} className="text-link">
            {ui.contact[l]}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
export function Journey({ locale: l }: { locale: Locale }) {
  const [active, setActive] = useState(0);
  const explanations = [
    t(
      "Identify suitable suppliers and products.",
      "Identifier fournisseurs et produits adaptés.",
      "تحديد الموردين والمنتجات المناسبة.",
    ),
    t(
      "Compare offers and coordinate purchase.",
      "Comparer les offres et coordonner les achats.",
      "مقارنة العروض وتنسيق الشراء.",
    ),
    t(
      "Agree and conduct relevant quality checks.",
      "Convenir et réaliser les contrôles pertinents.",
      "الاتفاق على فحوص الجودة المناسبة وتنفيذها.",
    ),
    t(
      "Coordinate the required trade documents.",
      "Coordonner les documents commerciaux requis.",
      "تنسيق المستندات التجارية المطلوبة.",
    ),
    t(
      "Arrange clearing through the agent network.",
      "Organiser le dédouanement via le réseau.",
      "ترتيب التخليص عبر شبكة الوكلاء.",
    ),
    t(
      "Coordinate owned road or partner freight.",
      "Coordonner route détenue ou fret partenaire.",
      "تنسيق النقل البري المملوك أو الشحن عبر الشركاء.",
    ),
    t(
      "Verify the final delivery against requirements.",
      "Vérifier la livraison selon les exigences.",
      "التحقق من التسليم النهائي وفق المتطلبات.",
    ),
  ];
  return (
    <section className="journey section">
      <p className="eyebrow">
        {
          t(
            "ONE COORDINATED JOURNEY",
            "UN PARCOURS COORDONNÉ",
            "رحلة منسقة واحدة",
          )[l]
        }
      </p>
      <h2>
        {
          t(
            "Every handoff. Handled.",
            "Chaque transition. Prise en charge.",
            "كل انتقال. نتولاه.",
          )[l]
        }
      </h2>
      <div className="journey-steps" role="group" aria-label={ui.explore[l]}>
        {journey.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {s[l]}
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <p className="journey-description" aria-live="polite">
        {explanations[active][l]}
      </p>
    </section>
  );
}
