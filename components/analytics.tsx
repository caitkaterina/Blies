"use client";
import { useState } from "react";
import Script from "next/script";
import { t, type Locale } from "@/lib/i18n";
export function Analytics({
  locale: l,
  nonce,
  domain,
}: {
  locale: Locale;
  nonce?: string;
  domain: string;
}) {
  const [consent, setConsent] = useState(false),
    [dismissed, setDismissed] = useState(false);
  if (!domain || !/^[a-zA-Z0-9.-]+$/.test(domain)) return null;
  return (
    <>
      {consent && (
        <Script
          nonce={nonce}
          data-domain={domain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
      {!dismissed && (
        <div className="cookie-banner">
          <p>
            {
              t(
                "Allow optional privacy-focused analytics for this visit?",
                "Autoriser les analyses facultatives pour cette visite ?",
                "هل تسمح بتحليلات اختيارية لهذه الزيارة؟",
              )[l]
            }
          </p>
          <button
            onClick={() => {
              setConsent(true);
              setDismissed(true);
            }}
          >
            {t("Accept", "Accepter", "قبول")[l]}
          </button>
          <button onClick={() => setDismissed(true)}>
            {t("Decline", "Refuser", "رفض")[l]}
          </button>
        </div>
      )}
    </>
  );
}
