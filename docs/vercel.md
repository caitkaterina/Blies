# Historical marketing-only deployment notes

The current integrated deployment instructions are in [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md). The notes below apply to the earlier SQLite/disabled marketing-only implementation; keep disabled mode until approved staging prerequisites are validated.

# Vercel marketing deployment and persistent backend boundary

## Why the homepage failed

`app/[locale]/layout.tsx` fetched CMS contact settings with `published("settings")`. The homepage also fetched location overrides through `publicLocations()`. Previously both reached `lib/store.ts` → `db()` → `mkdirSync('/workspace/blies-private')`. These queries were incidental public-content enhancements, but they made every language page depend on a writable persistent filesystem.

Public modules now call `lib/public-store.ts`, which selects repository-owned marketing content on Vercel without importing or initializing the SQLite adapter. Existing source pages, translations, map classifications, layouts, navigation, RTL, schema, canonical/hreflang settings and indexing controls are retained. CMS-only fleet categories/articles/overrides are not fabricated or copied from private storage: they need an approved content migration/integration if those overrides exist on another host.

## Deploy this fix

1. In Vercel, select the project connected to `caitkaterina/Blies`; set the production branch to `main` and deploy the fix commit identified in the change report.
2. Framework preset: **Next.js**. Root directory: repository root (leave blank or use `.`); the cloud checkout's `/workspace/Blies` path is not a Vercel project directory.
3. Select **Node.js 24.x**, matching `.nvmrc` and package engines. Install command: `npm ci`. Build command: `npm run build`. Leave the Next.js output directory on its framework default; do not use a static-export override or the cloud onboarding install/start script on Vercel.
4. Add `BLIES_STORAGE_MODE=disabled` to both Production and Preview environments. The code also detects `VERCEL=1` / `VERCEL_ENV` and rejects SQLite there even if `BLIES_STORAGE_MODE=sqlite` is accidentally set. Do not disable Vercel's automatic system environment metadata.
5. Set `BLIES_SITE_URL` to the **actual HTTPS canonical production origin**, with no trailing slash/path. For an interactive preview deployment, use that preview's actual origin as its setting. Same-origin checks remain strict; an origin mismatch must not be fixed by removing CSRF/origin validation.
6. Retain `BLIES_LAUNCH_APPROVED=false` until the existing brand, legal, translation and launch reviews are complete. This deliberately preserves development robots/noindex behaviour. Do not enable indexing just to improve an audit score.
7. Remove any attempted `/workspace` or `/tmp` database workaround from Vercel configuration. `BLIES_DATA_DIR` cannot make the local adapter safe on serverless hosting. Email/scanner/admin secrets alone do not enable the private backend.
8. Redeploy after saving environment settings. Verify `/en`, `/fr`, `/ar`, `/en/procurement`, `/en/quote`, `/en/tracking`, `/sitemap.xml` and `/favicon.ico` return HTTP 200. Verify Arabic RTL and navigation in a browser.
9. A same-origin quote/tracking submission must return HTTP **503** with `code: BACKEND_UNAVAILABLE`, no reference or success state. Private admin/content/document APIs must deny anonymous access. Sign-in is closed even if local staff credentials were accidentally supplied. Inspect runtime logs to confirm no storage-directory initialization occurs on these marketing requests.

These instructions are locally tested against a production Next.js server configured like Vercel, including an unwritable storage path. They are not a claim that the remote Vercel deployment has already been redeployed or verified.

## What works in marketing-only mode

All repository-backed English/French/Arabic marketing and legal-review pages; services/industries/fleet overview; header/footer; interactive map and service/category selectors; editable quote journey; tracking explainer; responsive/RTL layout; metadata, schema, sitemap and robots; optional separately configured consent-based analytics. Quotation and tracking forms clearly disclose unavailable backend services. File selection is unavailable without a supported backend and scanner. No ephemeral records or fake success responses are created.

## What requires durable infrastructure

| Feature                                                       | Required infrastructure                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Quotes, tracking enquiries, queues and staff follow-up        | Managed durable database adapter, transactions, schema/migrations and privacy/retention controls                                           |
| MFA sign-in, replay protection, abuse limits and audit trails | Durable security-state storage plus protected credentials/session secrets; approved identity provider may replace local staff provisioning |
| CMS fleet/articles/services/translations/settings             | Managed content database/provider and an explicit migration of approved published content                                                  |
| Private RFQs/BOQs/drawings                                    | Private object storage with quarantine, authorised expiring access, retention and encryption                                               |
| Upload acceptance                                             | Real malware scanner, authenticated verdict callbacks and fail-closed quarantine-to-clean promotion                                        |
| Confirmation and staff-response email                         | Verified sender, email provider credentials, idempotency, durable delivery state/retry handling                                            |

A managed provider is **not connected by this fix**, and no managed adapter is silently substituted for SQLite. Those integrations must be implemented and tested before enabling these features on Vercel. Setting an unsupported storage mode keeps the backend closed.

## Compatibility audit

- `node:sqlite` is a Node built-in, not an installable npm native package. It is now obtained lazily with `process.getBuiltinModule` only after the persistent-host capability guard passes. The unnecessary `serverExternalPackages: ['node:sqlite']` configuration was removed. Node 24 remains required by the existing persistent-host implementation.
- Filesystem APIs remain in the persistent-host adapter and private-file workflow. They are not used as Vercel persistence. Public quote rendering imports only capability metadata, not `lib/enquiries.ts` and its private-storage workflow.
- Next.js App Router and proxy remain supported framework conventions; public pages are dynamically rendered for CSP nonces. This is a regular Next.js deployment, not a static export.
- `proxyClientMaxBodySize: '32mb'` is a Next.js setting, **not** an override of Vercel's platform request limits. Before enabling Vercel uploads, review current [Function limits](https://vercel.com/docs/functions/limitations). The existing persistent-host multipart API accepts up to three 10 MB files; it must not simply be enabled unchanged on Vercel. Use authenticated direct-to-private-quarantine storage uploads and verified scanning callbacks for a managed implementation.
- Playwright, Chromium, OpenSSL and Lighthouse are local development/test tools; Vercel's app build does not launch them. There is no production browser native dependency added by this fix.
- No TLS/signature verification, MFA, role checks, CSRF/origin checks, scanner validation or audit requirements were bypassed. Storage initialization failures produce controlled unavailable responses; sign-in audits occur before issuing a session cookie.

## Persistent Node host

Outside Vercel, the default remains the SQLite adapter; `BLIES_STORAGE_MODE=sqlite` may be explicit. Set `BLIES_DATA_DIR` to an encrypted durable private volume and provide the existing real email/scanner and protected staff settings. Existing CMS overrides, enquiries, role permissions, audit tables and authenticated downloads remain viable. A local storage initialization failure does not take down marketing pages; it fails private operations closed. No private records are recreated, moved or reset by this fix.

## Free-plan suitability

The marketing-only application is technically compatible with Vercel's Node/serverless architecture. Free hosting is not a promise of free databases, storage, scanning, email or identity services. Confirm that the current [Vercel Hobby plan terms](https://vercel.com/docs/plans/hobby) permit the intended BLIES business use before committing to that plan; Hobby has historically been limited to personal/non-commercial use. Current provider documentation could not be fetched from this execution environment (network proxy returned Forbidden), so current plan entitlements/body limits were not independently verified here.
