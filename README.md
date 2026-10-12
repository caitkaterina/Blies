# BLIES — The supply chain, handled.

A responsive, trilingual corporate website for **BLIES (Pty) Ltd — Business Logistics Imports Exports & Suppliers**. Next.js App Router, React, TypeScript, Zod and private SQLite records, running on Node.js 24.

## Local development

```sh
npm ci
npm run dev
```

The root redirects to `/en`. Public content has `/en`, `/fr` and `/ar` URLs; Arabic renders right to left. `/admin` is separate from the public experience and has no default login.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
npm run test:e2e
```

Browser tests use system Chromium (`/usr/bin/chromium`) and OpenSSL, private ephemeral records under `/tmp`, randomly generated test passwords, and an HTTPS scanner-contract fixture. The fixture is **not** a malware engine. Production uploads require a real scanner. Tests do not send real email or contact production CRM systems.

## Implemented

- Procurement and logistics receive equal navigation and homepage prominence.
- All named core, service, support, industry, technology and legal routes; fleet detail routes are published from verified CMS entries.
- Eleven-option service navigator with service journeys and editable quotation pre-filling.
- Eight-step quotation wizard with conditional cold-chain fields, backend validation, reference numbers, private records, queue routing, consent, upload progress and honest email-delivery states.
- Private PDF/JPG/PNG documents, signature validation, size/count limits, mandatory scanner verdicts and authenticated downloads.
- Tracking enquiries create records; there are no fictional tracking positions or shipment statuses.
- Password + TOTP staff access, signed HttpOnly sessions, CSRF protection, roles, audit trails, private enquiry assignments and response drafts.
- Trilingual CMS editing, draft/published/archived status, ordering, version history, verified fleet publication, authentic media URLs, location classifications and contact configuration.
- Interactive schematic world map with an accessible market selector; coordinated supply-chain journey; Trust Centre; editorial Insights articles.
- Mobile Quote / Call / WhatsApp / Track action bar; reduced motion; translated public content and forms; per-language metadata and `hreflang`; sitemap; robots; CSP.
- Reserved future routes for My BLIES, Document Vault and Mode Recommender, explicitly labelled future development.

## Important launch boundary

This is an implemented development application, not a certified or launch-approved website. French and Arabic are editorial drafts needing professional human review. The legal pages are review drafts. The approved logo, authentic fleet assets, fleet category verification and final corporate contacts are not supplied. No fleet totals, capacities, certifications, clients, testimonials or partner ownership are invented. Public indexing is disabled by default.

The temporary development email is `dediguelaclauda@gmail.com`; the development telephone is `+27 63 240 0693`. There is no approved WhatsApp number, so that action leads to contact details rather than an invented recipient.

See [production configuration](docs/production.md), [requirements and factual constraints](docs/requirements.md), and [validation results](docs/validation.md). Secure runtime credentials must be entered through the deployment secret manager, never committed or pasted into chat.
