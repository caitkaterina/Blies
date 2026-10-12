# Vercel storage fix — verified checks

The shared public layout previously queried SQLite CMS settings, and the homepage queried location overrides. Both initialized `/workspace/blies-private` during rendering. Public rendering now uses a separate capability-aware content reader; private routes retain their security controls and require durable infrastructure.

## Commands and results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 11 unit tests passed, zero failed/skipped.
- `VERCEL=1 BLIES_STORAGE_MODE=disabled BLIES_DATA_DIR=/proc/blies-never-create npm run build`: production build tested without an available local storage directory.
- `npm run test:vercel`: 5 production-server tests passed, zero failed/skipped. Includes all 126 public language routes, metadata/RTL/sitemap, honest quote/tracking/upload 503 responses, admin closure despite configured secrets, origin rejection, headers and translated unavailable states.
- `npm run test:storage-failure`: 3 production-server tests passed, zero failed/skipped. A deliberately invalid durable directory (`/dev/null/private-storage`, producing ENOTDIR) does not break marketing rendering; private operations return sanitized 503 responses and sign-in issues no cookie.
- `BLIES_STORAGE_MODE=sqlite VERCEL= VERCEL_ENV= npm run test:e2e`: all 11 original browser/integration tests passed, zero failed/skipped. Real private test records, content publication, role checks, MFA, CSRF, uploads, scanning verdicts, private downloads, multilingual pages and accessibility checks remain exercised. Isolated test databases are fixtures, never production storage replacements.

The first new test assertions were corrected to handle HTML attribute casing and to scope alerts to the actual form rather than Next.js’s route announcer. The storage-failure fixture was changed from procfs to a deterministic ENOTDIR path after procfs stalled startup; all three failure tests then completed successfully. No failed test was disabled.

No remote Vercel redeployment, managed database, real malware engine, object storage, email delivery or production readiness is asserted. Provider documentation requests were blocked by this environment’s network proxy; verify current Vercel commercial-use terms and function body limits through the official links in the deployment guide.

## Changed files

- `.env.example`
- `README.md`
- `app/[locale]/[...slug]/page.tsx`
- `app/[locale]/layout.tsx`
- `app/admin/page.tsx`
- `app/api/admin/content/route.ts`
- `app/api/admin/documents/[id]/route.ts`
- `app/api/admin/login/route.ts`
- `app/api/admin/records/route.ts`
- `app/api/quotes/route.ts`
- `app/api/tracking/route.ts`
- `app/sitemap.ts`
- `components/admin.tsx`
- `components/home.tsx`
- `components/quote.tsx`
- `docs/production.md`
- `docs/validation.md`
- `docs/vercel-validation.md`
- `docs/vercel.md`
- `lib/auth.ts`
- `lib/backend.ts`
- `lib/capabilities.ts`
- `lib/enquiries.ts`
- `lib/i18n.ts`
- `lib/public-content.ts`
- `lib/public-store.ts`
- `lib/storage-policy.ts`
- `lib/store.ts`
- `next.config.ts`
- `package.json`
- `playwright.storage-failure.config.ts`
- `playwright.vercel.config.ts`
- `tests/storage-failure/failure.spec.ts`
- `tests/storage-policy.test.ts`
- `tests/vercel/storage.spec.ts`
