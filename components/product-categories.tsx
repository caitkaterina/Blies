"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/lib/categories";
import { t, ui, type Locale } from "@/lib/i18n";
export function ProductCategories({ locale: l }: { locale: Locale }) {
  const [selected, setSelected] = useState(categories[0]);
  return (
    <section className="product-categories">
      <h2>
        {
          t(
            "Find your product category",
            "Trouvez votre catégorie de produits",
            "ابحث عن فئة منتجك",
          )[l]
        }
      </h2>
      <div
        className="category-buttons"
        role="group"
        aria-label={ui.procurement[l]}
      >
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            aria-pressed={c.id === selected.id}
          >
            {c.title[l]}
          </button>
        ))}
      </div>
      <div className="category-result" aria-live="polite">
        <h3>{selected.title[l]}</h3>
        <p>
          {
            t(
              "Share your specifications, quantities and delivery requirements. We will assess suppliers and availability; products are not advertised as retail stock.",
              "Indiquez spécifications, quantités et livraison. Nous évaluerons fournisseurs et disponibilité ; les produits ne sont pas un stock de détail.",
              "قدم المواصفات والكميات ومتطلبات التسليم. سنقيّم الموردين والتوافر؛ المنتجات ليست مخزونًا للبيع بالتجزئة.",
            )[l]
          }
        </p>
        <Link
          className="button"
          href={`/${l}/quote?service=procurement&category=${selected.id}`}
        >
          {ui.quote[l]}
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}
