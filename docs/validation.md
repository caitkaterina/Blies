# Verified validation — 12 October 2026

Environment: Node.js 24.19.0, npm 11.9.0, Next.js 16.4.0. Frozen `npm ci` completed. The final application passed ESLint, TypeScript and `next build`.

## Automated results

- **9 unit tests passed**, zero failed/skipped: normalized requests, invalid data/consent/service rejection, temperature requirements, past dates, tracking references, file signatures, navigator route resolution, translation coverage and sea/air ownership restrictions.
- **11 browser/integration tests passed**, zero failed/skipped. The route sweep covers 126 language-specific URLs: 29 service/company/legal pages, 5 articles, and 8 core/future informational routes in each language.
- Browser tests exercise all 11 service navigator choices; a complete eight-step cold-chain quote; a genuine backend reference and private CRM record; pending-email honesty; a clean scanner-contract upload; signature rejection; scanner rejection; authenticated private downloads; MFA sign-in; CMS publication/versioning/reordering/archival; editor/sales role separation; CSRF denial; mobile action order; Arabic RTL; category pre-fill; language-preserving query strings; and editorial links.
- Axe WCAG-tagged automated scans passed on English/Arabic homepages and quote/tracking pages. This is not independent WCAG 2.2 AA certification; manual keyboard, screen-reader and device review remains required.
- Production `npm start` was exercised. English desktop and Arabic mobile returned 200, hydrated without page errors and had no horizontal overflow. Favicon returned 200. Production browser console errors were resolved.

## Local mobile Lighthouse audit

Final production-server lab run: **Performance 91, Accessibility 100, Best Practices 100, SEO 66**. LCP 3.0 seconds, CLS 0.055, total blocking time 40 ms. Results vary between lab runs; this is not deployed field performance. LCP remains above the usual 2.5-second good threshold and needs further optimisation/measurement on the actual host. SEO is deliberately limited by development `noindex` and robots restrictions; do not remove these before launch approval.

## Dependency audit

Production dependency audit: **zero vulnerabilities**. The full audit reports **five high-severity development-chain entries**, all related to the same `braces` stack-exhaustion advisory propagated through `micromatch`, `fast-glob`, `@next/eslint-plugin-next` and `eslint-config-next`. Registry latest `braces` is 3.0.3; npm reports no supported fix available. These packages are in the lint tooling chain, not the application request path. Keep lint inputs trusted and update the toolchain when upstream publishes a compatible fix. No signature/checksum/TLS verification was disabled.

## External launch gates — not claimed verified

Actual Resend delivery; a real malware engine; production administrator credentials; encrypted production storage and recovery; final logo/fleet media/categories; approved corporate contacts/WhatsApp; human French/Arabic review; legally approved policies; final operational confirmations; penetration testing; actual deployed accessibility/performance/SEO; publication and restoration in a new cloud task. The HTTPS scanner used in integration tests is an isolated **contract fixture, not a malware engine**. All test data stayed in separate private `/tmp` directories. Email was not sent to customers.

Earlier failed origin checks, SQLite-to-client serialization, font-package imports, colour contrast, marker spacing, article links and favicon/name issues were investigated and corrected. Final passing outcomes above are from completed runs, not planned commands.
