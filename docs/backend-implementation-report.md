# BLIES Supabase implementation handover

Branch: `feat/supabase-persistence`. Both repositories inspected; backend changes only. No production data was modified, no migrations were applied remotely, and no deployment was initiated.

## Completed

- Optional asynchronous Supabase PostgREST persistence adapter with retained local SQLite workflow.
- PostgreSQL migration with enquiry tables/views, document relationships, CMS/version history, audit records and durable limits; RLS enabled and browser access denied.
- Atomic enquiry/document-metadata/audit creation and administrative update/audit functions.
- Contact endpoint and adapted quotation/tracking, staff records, CMS and download operations.
- Existing password/TOTP, server roles, cookies and administrator CSRF checks retained; durable TOTP replay limits in managed mode.
- Private Storage uploads after signature validation/scanning, safe UUID paths, authorized 60-second signed downloads; no public object URLs.
- Exact-origin CORS for public submissions only, body limits enforced on actual bytes, consent/honeypot validation.
- Environment setting names, staging activation/deployment/security instructions, and API contract for the separate React frontend.

## Validation actually executed

- `npm test`: 17 passed, zero failed/skipped, including PostgreSQL migration execution in PGlite, transactions, constraints, RLS/browser denial, durable limits, CMS history and mocked HTTP behavior.
- `npm run test:e2e`: 12 passed, zero failed/skipped; isolated SQLite persistence, contact/quotation workflows, scanner fixture, private downloads, MFA/roles/CSRF and CMS/browser behavior.
- `npm run test:vercel`: 5 passed; marketing-only deployment remains closed for private operations.
- `npm run test:storage-failure`: 3 passed; unavailable filesystem storage fails closed without breaking marketing pages.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`: passed.
- The first integration run exposed non-plain SQLite row objects passed into the administrator client component. Adapter serialization was corrected and the complete suite passed on rerun.

## Not connected or live-tested

Supabase project contents, actual Storage policies/PostgREST grants, live MFA with managed security state, scanner service, signed URL expiry, deployed CORS and production frontend communication are unverified. Local PostgreSQL tests use stub Storage metadata and do not emulate the Supabase Storage service. Existing customer/CMS data has not been migrated. Frontend forms remain email-only until their separate integration. No role-account migration to Supabase Auth is included: existing protected runtime accounts remain authoritative.

Managed uploads are intentionally limited to 2 MiB combined file bytes (3 MiB request), with scanning mandatory. Larger direct-to-quarantine uploads, durable submission idempotency/email outbox and automatic orphan-file reconciliation remain future work. Read docs/supabase.md before activation.

## Single next action

Connect a **staging Supabase project** to this session and identify it so its current schema/policies/buckets can be inspected before migration review and live validation. Do not paste credentials into chat.

## Exact changed files

- `app/api/contact/route.ts`
- `docs/supabase.md`
- `lib/persistence.ts`
- `lib/private-files.ts`
- `lib/request-body.ts`
- `lib/supabase-http.ts`
- `supabase/migrations/202610130001_backend.sql`
- `tests/browser/contact.spec.ts`
- `tests/public-security.test.ts`
- `tests/request-body.test.ts`
- `tests/supabase-http.test.ts`
- `tests/supabase-schema.test.ts`
- `.env.example`
- `README.md`
- `app/admin/page.tsx`
- `app/api/admin/content/route.ts`
- `app/api/admin/documents/[id]/route.ts`
- `app/api/admin/login/route.ts`
- `app/api/admin/records/route.ts`
- `app/api/quotes/route.ts`
- `app/api/tracking/route.ts`
- `lib/auth.ts`
- `lib/enquiries.ts`
- `lib/public-store.ts`
- `lib/security.ts`
- `lib/storage-policy.ts`
- `lib/store.ts`
- `lib/validation.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `tests/storage-policy.test.ts`
- `docs/backend-implementation-report.md` (this report)
