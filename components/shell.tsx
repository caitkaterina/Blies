"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  Menu,
  X,
  Phone,
  MessageCircle,
  LocateFixed,
} from "lucide-react";
import { ui, locales, type Locale } from "@/lib/i18n";
import { pages } from "@/lib/content";
export function LanguagePicker({ locale }: { locale: Locale }) {
  const path = usePathname();
  const search = useSearchParams();
  return (
    <div
      className="languages"
      aria-label={
        locale === "ar" ? "اللغة" : locale === "fr" ? "Langue" : "Language"
      }
    >
      {locales.map((l) => (
        <Link
          key={l}
          href={
            path.replace(/^\/(en|fr|ar)(?=\/|$)/, `/${l}`) +
            (search.size ? `?${search.toString()}` : "")
          }
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
        >
          {l === "ar" ? "العربية" : l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
export function Header({ locale: l }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="notice">{ui.development[l]}</div>
      <header className="site-header">
        <Link className="wordmark" href={`/${l}`}>
          BLIES
          <span>
            {l === "ar"
              ? "شريك سلسلة الإمداد"
              : l === "fr"
                ? "PARTENAIRE LOGISTIQUE"
                : "SUPPLY CHAIN PARTNER"}
          </span>
        </Link>
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={open ? ui.close[l] : ui.menu[l]}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-nav"
          className={open ? "main-nav open" : "main-nav"}
          aria-label={ui.menu[l]}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {(["procurement", "logistics", "company"] as const).map((group) => (
            <details key={group}>
              <summary>{ui[group][l]}</summary>
              <div className="dropdown">
                {pages
                  .filter(
                    (p) =>
                      p.group === group ||
                      (group === "logistics" && p.group === "support") ||
                      (group === "company" && p.group === "technology"),
                  )
                  .map((p) => (
                    <Link key={p.slug} href={`/${l}/${p.slug}`}>
                      {p.title[l]}
                    </Link>
                  ))}
                {group === "company" && (
                  <>
                    <Link href={`/${l}/contact`}>{ui.contact[l]}</Link>
                    <Link href={`/${l}/insights`}>{ui.insights[l]}</Link>
                  </>
                )}
              </div>
            </details>
          ))}
          <Link href={`/${l}/fleet`}>{ui.fleet[l]}</Link>
          <LanguagePicker locale={l} />
          <Link className="button small" href={`/${l}/quote`}>
            {ui.quote[l]}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
    </>
  );
}
export function Footer({
  locale: l,
  contact,
}: {
  locale: Locale;
  contact?: { phone?: string; whatsapp?: string; corporateEmail?: string };
}) {
  return (
    <>
      <footer>
        <div className="footer-intro">
          <Link className="wordmark" href={`/${l}`}>
            BLIES
          </Link>
          <p>{ui.footer[l]}</p>
          <LanguagePicker locale={l} />
        </div>
        <div className="footer-contact">
          <a
            href={`mailto:${contact?.corporateEmail || "dediguelaclauda@gmail.com"}`}
          >
            {contact?.corporateEmail || "dediguelaclauda@gmail.com"}
          </a>
          <a href={`tel:${contact?.phone || "+27632400693"}`} dir="ltr">
            {contact?.phone || "+27 63 240 0693"}
          </a>
          <Link href={`/${l}/contact`}>{ui.contact[l]}</Link>
        </div>
        <div className="footer-grid">
          {(
            [
              "procurement",
              "logistics",
              "industries",
              "company",
              "support",
              "technology",
              "legal",
            ] as const
          ).map((group) => (
            <div key={group}>
              {pages
                .filter((p) => p.group === group)
                .map((p) => (
                  <Link key={p.slug} href={`/${l}/${p.slug}`}>
                    {p.title[l]}
                  </Link>
                ))}
            </div>
          ))}
          <div>
            <Link href={`/${l}/quote`}>{ui.quote[l]}</Link>
            <Link href={`/${l}/contact`}>{ui.contact[l]}</Link>
            <Link href={`/${l}/tracking`}>{ui.track[l]}</Link>
            <Link href={`/${l}/insights`}>{ui.insights[l]}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BLIES (Pty) Ltd</span>
          <span>{ui.reviewNotice[l]}</span>
        </div>
      </footer>
      <nav className="mobile-actions" aria-label={ui.contact[l]}>
        <Link href={`/${l}/quote`}>
          <ArrowUpRight />
          {ui.quote[l]}
        </Link>
        <a href={`tel:${contact?.phone || "+27632400693"}`}>
          <Phone />
          {ui.call[l]}
        </a>
        <Link
          href={
            contact?.whatsapp
              ? `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`
              : `/${l}/contact#whatsapp`
          }
          title={contact?.whatsapp ? "WhatsApp" : ui.whatsapp[l]}
        >
          <MessageCircle />
          WhatsApp
        </Link>
        <Link href={`/${l}/tracking`}>
          <LocateFixed />
          {ui.track[l]}
        </Link>
      </nav>
    </>
  );
}
