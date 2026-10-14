# BLIES end-to-end implementation report

The original Figma Make website in `caitkaterina/BliesWebsite` remains the visual source of truth. This work integrates that React/Vite site with the existing Next.js backend in `caitkaterina/Blies`; it does not replace the public website with Next.js marketing pages.

The code is prepared for staging configuration and provider testing. It is **not approved for publication**. Live Supabase/Vercel connections were unavailable, no real migration or deployment was performed, and no production records/settings were changed. The user-nominated Supabase target `BLIES` / `rwbzxycugebkleictweh` remains independently unconfirmed as staging.

## Sources and branches

| Repository | Verified starting point | Implementation branch |
| --- | --- | --- |
| `caitkaterina/Blies` | `43fed4f9344dd20b2d866793e7dedc9a52748a8f` (`feat/supabase-persistence`) | `feat/end-to-end-integration` |
| `caitkaterina/BliesWebsite` | `210ccf668bb26c551a3c88d1e8ee6ec8d245e117` (Figma Make source) | `feat/backend-integration` |

Implementation commits are recorded in the final handover. No production merge or branch-history rewrite was performed.

## Implemented behavior

| Area | Result and scope | Completion label |
| --- | --- | --- |
| Contact and quotations | Existing forms submit to real endpoints, validate input, require consent, show accepted references only after server confirmation and preserve quote specifications. Document input uses managed limits. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Submission reliability | Durable payload-bound idempotency claims/receipts protect unchanged manual retries; records, metadata, audit and receipt/outbox jobs commit together. Changed payload/key conflicts do not silently create another record. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Customer accounts | GoTrue registration, verified sign-in, sign-out, token-hash verification/recovery, refresh, password reset and profile-name update. Provider-verified UUID owns data; tokens stay in HttpOnly cookies through same-origin proxy. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Customer dashboard | Existing-style account route displays owned request history, private document links and genuine shipment event history with loading/empty/error states. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Tracking | Existing tracking enquiry remains supported. Signed-in account lookup returns actual owned stored shipments/events; staff create and update genuine records, without mocked events. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Staff workflows | Existing scrypt/TOTP/MFA, signed session, roles and CSRF preserved. Shipment management, paginated internal customer lookup, admin-only audit view and protected notification draining added. Enquiry status/reply/assignment and existing CMS continue through the persistence adapter. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| PostgreSQL/RLS | Customer ownership/shipment and reliability migrations extend the reviewed base schema; restricted RPCs and limited customer-read policies protect internal columns and foreign records. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Private documents | Existing signature/scanner validation and private UUID paths preserved; customer downloads add ownership checks, staff downloads retain role/audit checks, signed links last 60 seconds. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Business email | Durable Resend outbox, stable provider idempotency keys, token-fenced five-minute delivery leases, parallel bounded sends, backoff, receipt/status/reply/shipment/internal notifications and escaped branded HTML. Configured providers get a post-response attempt through Next.js `after`; retries remain durable. Acceptance/delivery states remain distinct. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Deployment architecture | Separate Vite and Next.js projects; restricted frontend server proxy keeps customer calls/cookies same-origin. Vite local proxy mirrors the integration. Staff/internal routes are not publicly proxied. | **IMPLEMENTED, NOT LIVE-VERIFIED** |
| Real provider/deployment verification | Actual Supabase project inspection, schema/grants/Storage/Auth, SMTP, Resend/scanner and deployed Vercel integration require connections/configuration/approval. | **BLOCKED** |
| Controlled visual preservation | Six baseline/current screenshot pairs for home and initial quote were pixel-identical at desktop/tablet/mobile with identical external fonts/images blocked and reduced motion. This limited result is not full live visual acceptance. | **PASS** for that controlled scope |
| Full visual acceptance | All routes/locales, actual external assets, animation and business review remain unverified. | **BLOCKED** |

Local tests passed for the scopes recorded below. Those results do not change the provider-dependent features to live PASS.

## API and architecture

The frontend defaults to `/api`; Vercel's allowlisted server function forwards only contact, quotation, tracking, health and customer paths to server-only `BLIES_BACKEND_URL`. Customer cookies/Origin/CSRF and response cookies are preserved; staff cookies, arbitrary targets and administrator/internal endpoints are excluded. Local Vite uses the same configured backend origin.

Public `POST /api/contact`, `/api/quotes` (multipart) and `/api/tracking` return an accepted reference after durable commit. `Idempotency-Key` is reused for the same unchanged form after timeout/network failure. The UI does not report acceptance for a malformed/non-success response and does not automatically retry submissions.

Customer endpoints are `/api/customer/auth`, `/session`, `/records`, `/shipments` and `/documents/[id]`. Auth mutation actions are register/login/logout/recover/verify/refresh/password/profile. The account page requests authorized downloads as JSON (`?format=json`) after the session refresh flow and validates the returned download destination before navigation; the default route retains redirect/binary handling. The backend verifies GoTrue user identity on protected operations and filters owned records; it does not trust a browser-supplied owner or staff role. Guests remain unowned, even if their email matches a later account.

Staff remain on backend `/admin`. Administrator/sales roles manage enquiries/documents/shipments, editors retain content duties, and only administrators access audit/notification controls. The original quotation statuses `received`, `in-review`, `responded`, `closed` were deliberately preserved. Shipment statuses are bounded staff-entered text; pricing, commercial approvals, expiry rules and a fabricated lifecycle were not invented.

The code security review led to tested fixes for expired customer ownership during submission, locked/token-fenced cancellation before upload cleanup, token-fenced outbox claims, restored confirmation-email retry, denial of editors' global audit access, mapped remote constraint errors and corrected Auth callbacks. Guest submissions remain deliberate, rather than an automatic downgrade from an expired customer session.

## Files and systems changed

Backend changes are grouped below; final Git diff/history supplies the authoritative inventory:

- Configuration/integration: `.env.example`, `lib/security.ts`, `lib/enquiries.ts`, `lib/persistence.ts`, `lib/store.ts`, `playwright.config.ts`, `app/api/health/route.ts`.
- Customer ownership/Auth: `lib/customer-auth.ts`, `lib/customer-store.ts`, `app/api/customer/response.ts`, customer `auth`, `session`, `records`, `shipments`, `documents/[id]` routes and `supabase/migrations/202610140001_customers_shipments.sql`.
- Durable delivery: `lib/delivery-store.ts`, `lib/notifications.ts`, `lib/email-template.ts`, `app/api/internal/notifications/route.ts`, `supabase/migrations/202610140002_delivery.sql`.
- Staff functionality: `components/admin.tsx`, `app/api/admin/records/route.ts`, new `shipments`, `audit`, `notifications` routes.
- Validation evidence: customer Auth/schema tests, delivery tests and browser staff-workflow tests, plus existing suite updates, cross-repository Figma tests, account UI contract checks, controlled visual comparisons and offline staff bootstrap verification.
- Six requested documents: this report, `VERCEL_DEPLOYMENT_GUIDE.md`, `SUPABASE_SETUP.md`, `ENVIRONMENT_VARIABLES.md`, `TESTING_AND_ACCEPTANCE.md`, `OPERATIONS_AND_TROUBLESHOOTING.md`.

Frontend integration changes:

- `src/lib/api.ts`, `src/lib/enquiry.ts`, `src/pages/Contact.tsx`, `src/pages/Quote.tsx`, `src/vite-env.d.ts`: real submissions, validation, consent, managed attachments, honest state/error handling and idempotent retries.
- `src/pages/Account.tsx`, `src/App.tsx`, `src/components/Shell.tsx`, `src/locales/account.ts`, `src/locales/integration.ts`, `src/locales/index.ts`: functional account/dashboard route, footer account link, multilingual functional states and tracking access.
- `api/[...path].ts`, `server/api-proxy.ts`, `vite.config.ts`, `.env.example`, `tsconfig.api.json`, `tests/proxy.test.ts`: restricted same-origin deployment/development proxy and verification.

The existing main navigation, branding, assets, fonts and stylesheet design are preserved. Necessary visible changes are consent/document controls, loading/error/accepted states, a footer account link and the new account page using existing visual classes. Customer accounts did not exist in the baseline, so that functional page needs review rather than a claim that it is pixel-identical to an earlier page.

## Implementation commits

- Backend: `feat/end-to-end-integration`, implementation commit `455d6573a03bb8fe37c32ed529e4a9f5ac67d906`, based on `43fed4f9344dd20b2d866793e7dedc9a52748a8f`.
- Approved frontend: `feat/backend-integration`, implementation commit `10f7e2c2ba0b3e6f168e474e0a44275871ae8ebe`, based on `210ccf668bb26c551a3c88d1e8ee6ec8d245e117`.
- Documentation updates follow the backend implementation commit without changing application behavior. The final handover identifies the branch head; no production merge or deployment was initiated.

## Validation evidence

Actual results are recorded in [TESTING_AND_ACCEPTANCE.md](TESTING_AND_ACCEPTANCE.md):

| Commands | Actual result |
| --- | --- |
| Backend `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build` | **PASS** |
| Backend `npm test` | **PASS**: 32 passed, 0 failed, 0 skipped |
| Backend `npm run test:e2e` | **PASS**: 18 passed |
| Backend `npm run test:figma` | **PASS**: 4 passed, real frontend to isolated local backend/SQLite/scanner contract |
| Backend `npm run test:account-ui` | **PASS**: two Chromium customer-UI suites with mock HTTP only |
| Backend `npm run test:vercel`, `npm run test:storage-failure` | **PASS**: 5 and 3 passed respectively; local simulations |
| Frontend `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build` | **PASS**: proxy test 1 passed; build retains a bundle-size warning |
| Backend `npm audit --omit=dev`, frontend `pnpm audit --prod` | **PASS**: both reported 0 production dependency vulnerabilities |
| Client JavaScript scan | **PASS**: 0 privileged-variable references in scanned browser bundles |
| `node tests/figma/visual-check.mjs`, `python3 tests/figma/compare-visual.py` | **PASS**: 6 controlled pixel-identical baseline/current pairs |

PGlite uses artificial roles/Auth/Storage metadata, adapter tests use controlled HTTP fixtures, and local browser tests use isolated SQLite and scanner-contract fixtures. None proves live Supabase permissions, malware-engine behavior, delivered email or Vercel production routing. The final reruns resolved initial suite-output collisions and invalid storage-failure fixture payloads; no test remains failed or skipped in the reported runs.

## Known limitations and remaining gates

- No live Supabase or Vercel project is connected/verified. No migration, production merge or deployment was performed. The nominated project needs read-only inspection before any change.
- Real customer verification/recovery requires correctly configured Supabase SMTP, email verification, callback allowlist and token-hash email templates. Default implicit access-token links are not the supported flow.
- Local SQLite persistence remains available, but customer authentication still needs a configured GoTrue provider. Controlled Auth fixtures are test-only, not an offline customer-login implementation.
- Uploads require a real HTTPS scanner; managed requests preserve at most three files and 2 MiB **combined** bytes. Local SQLite still intentionally supports a larger limit; it is not production Vercel persistence.
- Database commits and Storage writes cannot be atomic; cleanup failures can leave private orphan objects requiring restricted reconciliation.
- Email is queued before a configured provider's post-response attempt, not guaranteed delivered. An approved scheduler or manual staff draining is necessary for retries. Automatic retry is bounded below the provider's idempotency window; exhausted/aged jobs require deliberate reconciliation. Business templates are currently English while the website remains English/French/Arabic.
- Customer/staff request and shipment lists return the latest 200 and audit shows the latest 100. Filtering operates on returned records; full request/shipment pagination/export is not added. Internal customer-account lookup is paginated at 50 per page and depends on live Auth; no local SQLite Auth registry is invented.
- Existing SQLite records/documents/CMS are not imported automatically. Guest requests are not claimed by email. A reviewed legacy-data migration/claim workflow is separate work.
- The shipment-email trigger is a narrow `SECURITY DEFINER` function that reads the owner's email from `auth.users`; it has fixed search path and revoked direct execution. Its owner/grants and existing policies must be inspected on the target project. Other transactional RPCs preserve invoker permissions.
- Rate limits provide durable shared/account controls. Trusted edge IP/WAF controls, provider abuse settings, backup recovery, domain/DNS, plan capacity and live secret handling remain deployment responsibilities to verify.
- Successful health/configuration responses report setting presence only; they do not prove provider connectivity or readiness.

## Safe next steps

1. Enable callable Supabase/Vercel access and independently confirm the actual staging project/origins. Run the read-only catalog/Storage/Auth inspection in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
2. Review conflicts, function changes, existing data and backups; approve only the staging migration plan. Configure real private Storage/Auth/scanner/email prerequisites and protected variables.
3. Deploy the two feature branches only to approved staging/preview projects with the exact settings in [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md).
4. Run isolated live positive/negative acceptance and visual review. Record evidence, resolve failures and obtain production approval before migration, merge or publication.

## Exact changed-file inventory

The inventory below includes application, tests and deployment/docs changes; it excludes dependencies, generated builds, screenshots, private environment files and test data.

### Backend

- `.env.example`
- `README.md`
- `app/api/admin/audit/route.ts`
- `app/api/admin/content/route.ts`
- `app/api/admin/customers/route.ts`
- `app/api/admin/logout/route.ts`
- `app/api/admin/notifications/route.ts`
- `app/api/admin/records/route.ts`
- `app/api/admin/shipments/route.ts`
- `app/api/contact/route.ts`
- `app/api/customer/auth/route.ts`
- `app/api/customer/documents/[id]/route.ts`
- `app/api/customer/records/route.ts`
- `app/api/customer/response.ts`
- `app/api/customer/session/route.ts`
- `app/api/customer/shipments/route.ts`
- `app/api/health/route.ts`
- `app/api/internal/notifications/route.ts`
- `app/api/quotes/route.ts`
- `app/api/tracking/route.ts`
- `components/admin.tsx`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/FINAL_IMPLEMENTATION_REPORT.md`
- `docs/OPERATIONS_AND_TROUBLESHOOTING.md`
- `docs/SUPABASE_SETUP.md`
- `docs/TESTING_AND_ACCEPTANCE.md`
- `docs/VERCEL_DEPLOYMENT_GUIDE.md`
- `docs/supabase.md`
- `docs/vercel.md`
- `lib/customer-auth.ts`
- `lib/customer-store.ts`
- `lib/delivery-store.ts`
- `lib/email-template.ts`
- `lib/enquiries.ts`
- `lib/notifications.ts`
- `lib/outbox-scheduler.ts`
- `lib/persistence.ts`
- `lib/security.ts`
- `lib/store.ts`
- `lib/supabase-http.ts`
- `lib/validation.ts`
- `package.json`
- `playwright.config.ts`
- `playwright.figma.config.ts`
- `playwright.storage-failure.config.ts`
- `playwright.vercel.config.ts`
- `scripts/bootstrap-admin.mjs`
- `supabase/migrations/202610140001_customers_shipments.sql`
- `supabase/migrations/202610140002_delivery.sql`
- `tests/bootstrap.test.ts`
- `tests/browser/admin-workflows.spec.ts`
- `tests/customer-auth.test.ts`
- `tests/customer-documents.test.ts`
- `tests/customer-schema.test.ts`
- `tests/customer-store.test.ts`
- `tests/delivery.test.ts`
- `tests/figma/account-failure-smoke.mjs`
- `tests/figma/account-smoke.mjs`
- `tests/figma/compare-visual.py`
- `tests/figma/forms.spec.ts`
- `tests/figma/visual-check.mjs`
- `tests/notifications.test.ts`
- `tests/storage-failure/failure.spec.ts`
- `tests/validation.test.ts`

### Approved frontend

- `.env.example`
- `.gitignore`
- `README.md`
- `api/[...path].ts`
- `package.json`
- `server/api-proxy.ts`
- `src/App.tsx`
- `src/components/Shell.tsx`
- `src/lib/api.ts`
- `src/lib/enquiry.ts`
- `src/locales/account.ts`
- `src/locales/index.ts`
- `src/locales/integration.ts`
- `src/pages/Account.tsx`
- `src/pages/Contact.tsx`
- `src/pages/Quote.tsx`
- `src/vite-env.d.ts`
- `tests/proxy.test.ts`
- `tsconfig.api.json`
- `vercel.json`
- `vite.config.ts`
