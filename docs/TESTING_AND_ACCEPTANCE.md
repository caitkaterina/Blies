# BLIES testing and acceptance

Use isolated local/staging records and accounts. Do not run destructive tests, migrations, recovery or fixture generation against production. Source code and successful builds are not proof that Supabase, Auth email, Storage, scanning, email delivery or Vercel deployment works.

Completion labels:

- **PASS**: implemented and verified by an actual test, with its scope stated.
- **IMPLEMENTED, NOT LIVE-VERIFIED**: code exists but its real provider/deployment behavior has not been confirmed.
- **BLOCKED**: a permission, credential, provider, approval or other prerequisite is missing.
- **FAIL**: a performed test or required behavior failed.

## Reproducible commands

Run the backend with Node 24/npm 11 from the root of `caitkaterina/Blies`:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:figma
npm run test:account-ui
npm run test:vercel
npm run test:storage-failure
npm audit --omit=dev
```

The frontend is Node 22/pnpm 10.34.3 from the root of `caitkaterina/BliesWebsite`:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
```

`pnpm typecheck` checks both the application and `tsconfig.api.json`; `pnpm test` runs the standalone proxy test using runtime TypeScript stripping and controlled HTTP servers. There is no frontend lint script. Do not run a formatter across unrelated files as an acceptance substitute.

Backend browser fixtures require Chromium and OpenSSL. Current configs use `/usr/bin/chromium`, temporary private SQLite data under `/tmp`, generated test-only staff credentials/TOTP, and an HTTPS scanner-contract fixture. If that executable is absent, install/provide a compatible browser and update a reviewable test configuration; do not silently skip the suite. The fixture returns the scanning contract and is **not a malware engine**. Vercel/storage-failure checks require the production build first.

## Evidence ledger

Executed against the implementation recorded as backend `455d6573a03bb8fe37c32ed529e4a9f5ac67d906` and frontend `10f7e2c2ba0b3e6f168e474e0a44275871ae8ebe`. Documentation-only commits may follow. All results below are local; no live migration, deployment or provider test is implied.

| Command/check | Actual result | Scope |
| --- | --- | --- |
| Backend `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | **PASS** | Lockfile installation, Node 24/npm 11 |
| Frontend `pnpm install --frozen-lockfile --store-dir /workspace/.pnpm-store` | **PASS** | Node 22/pnpm 10.34.3; lockfile unchanged |
| Backend `npm run lint`, `npm run typecheck`, `npm run build` | **PASS** | ESLint, TypeScript and production Next.js compilation |
| Backend `npm test` | **PASS** — 32 passed, zero failed/skipped | Validation, PGlite migrations/RLS/ownership, controlled GoTrue/PostgREST/Resend, real isolated SQLite, secure offline bootstrap |
| Backend `npm run test:e2e` | **PASS** — 18 passed | Existing multilingual/CMS/MFA/role/CSRF/document flows plus staff shipment/customer-directory/audit/notification behavior; test credentials and scanner contract |
| Backend `npm run test:figma` | **PASS** — 4 passed | Existing Figma contact/quote -> real local API/SQLite, preserved fields/document metadata, idempotent retries and expired-cookie denial |
| Backend `npm run test:vercel` | **PASS** — 5 passed | Local production-server simulation: disabled filesystem persistence never opens private features |
| Backend `npm run test:storage-failure` | **PASS** — 3 passed | Valid submissions hit forced unavailable storage; sanitized errors and closed staff access |
| Frontend `pnpm typecheck` | **PASS** | App and serverless proxy TypeScript projects |
| Frontend `pnpm test` | **PASS** — 1 passed | Real local HTTP proxy, body forwarding (including platform-prepared JSON), cookie filtering, redirects and route denials |
| Frontend `pnpm build` | **PASS** | Production Vite assets; existing nonfatal large-chunk warning |
| `BLIES_FRONTEND_TEST_URL=http://127.0.0.1:8443 npm run test:account-ui` | **PASS** — 2 Chromium scenarios | Mocked customer HTTP only: account actions, callback once under StrictMode, download, FR/AR, refresh/failure states; not a live Auth test |
| `node tests/figma/visual-check.mjs` and `python3 tests/figma/compare-visual.py` | **PASS** — 6 pixel-identical pairs | Home and initial quotation viewport at 1440×900, 768×1024, 390×844 vs frontend baseline `210ccf668bb26c551a3c88d1e8ee6ec8d245e117`; identical external font/image blocking and reduced motion. Does not establish full-page or live-asset visual acceptance. |
| `npm audit --omit=dev --json`, `pnpm audit --prod --json` | **PASS** — zero known production dependency vulnerabilities reported | Registry audit at this run; not a complete security certification |
| Client JavaScript scan | **PASS** | No references to service-role, staff signing, scanner or business-mail secret variable names in either client asset output. No live credentials were supplied. |
| `git diff --check` in both repositories | **PASS** | No whitespace errors |
| Live Supabase inventory/migrations/RLS/Auth/Storage, real email/scanner, deployed Vercel origins and redeployment persistence | **BLOCKED** | No callable project/provider connections or live configuration; nominated staging identity is not independently verified |

Failures encountered were investigated and corrected: platform callback/hash routing, customer-session ownership, fenced upload cleanup and email claims, editor audit exposure, remote SQL error mapping, confirmation retry and isolated test imports. Parallel browser artifact collisions were removed with per-suite output directories. Storage-failure cases now use valid contract payloads to exercise storage rather than fail before it. Relevant tests passed on rerun; no assertions were disabled.

The six screenshot comparisons cover unchanged initial views only. Contact/quote functional controls, the new account page, staff extensions, and actual Google/Unsplash loading require human/live acceptance. Provider-controlled cases use explicit fixtures and must not be represented as live passes.

## Staging journey checklist

Use two newly created customers, an approved administrator and sales/editor identities. Use artificial company/contact details and tiny harmless PDF/JPEG/PNG fixtures. Record references and test IDs in a private test log; avoid customer PII, tokens and signed URLs in logs or screenshots.

| Journey | Positive acceptance | Required failure/negative acceptance |
| --- | --- | --- |
| Contact | Existing Figma form receives HTTP 201/accepted reference; record appears in staff view and survives a new session | Missing consent/invalid input rejected; forbidden origin denied; outage produces failure, not success |
| Quotation | All submitted route/cargo/specification fields persist; receipt/reference are genuine | Final-step validation cannot bypass earlier requirements; invalid date/cold-chain temperature/file rejected |
| Duplicate prevention | Retry the same unchanged payload/key after an ambiguous network failure; one record/reference | Same key with changed payload is rejected; no automatic repeated submission on provider failure |
| Registration/verification | Actual provider sends confirmation; token-hash callback verifies; signed-in session established only after verification | Unverified identity denied; altered/expired callback denied; registration/recovery response does not enumerate accounts |
| Customer session | Sign-in, refresh, logout and recovery/password reset work through frontend `/api` | Missing/expired/forged token rejected; cookies are HttpOnly/Secure/Strict in production; no tokens in local storage |
| Customer history | Customer A sees owned quotations/documents/shipment events and saved profile name | Customer B cannot read A's records/documents by UUID/reference; forged browser owner ID/email has no effect |
| Guest requests | Guest submissions are accepted without account login | Guest records are not auto-claimed by a later account sharing their email |
| Shipment management | Authorized staff create a real shipment for an existing customer and append events; customer sees those genuine events | Unknown owner/duplicate reference/invalid data rejected; another customer receives no shipment data |
| Administrator | Existing password + TOTP login works, one-hour signed session/role checks persist | Missing/replayed/incorrect MFA rejected; customer account cannot become staff; editors cannot manage enquiries/documents/shipments |
| Staff updates | Quotation status/assignment/reply and CMS edits persist; audit events exist | Missing/wrong CSRF and unauthorized role denied; refresh/new session does not revert successful writes |
| Documents | Actual scanner accepts harmless bytes; object is private; authorized customer/staff gets temporary attachment link | Scanner absent/rejecting/timeouts fail closed; type/signature/size mismatch denied; public URL/sign/delete denied; 60-second link expires |
| Email outbox | Business records commit before mail; approved provider accepts jobs; stable delivery IDs prevent supported retry duplicates | Provider rejection leaves durable retry state; no false delivered claim; exhausted/aged jobs are inspected and reconciled |
| Persistence | Records available after fresh session and server redeployment | Never fallback to local SQLite/files on Vercel when Supabase is unavailable |
| Proxy/security | Only intended API paths reach configured backend; origins, cookies and security headers preserved | Administrative/internal paths and arbitrary targets denied; credentialed cross-site mutation cannot bypass checks |

Run direct anonymous/authenticated database and Storage negative checks as well as UI checks. Hidden buttons are not authorization. Check server logs and persisted records after every positive action, and distinguish accepted delivery from arrival in the recipient's inbox.

## Visual and responsive acceptance

The original frontend assets, styles and components remain the source of truth. Six baseline/current screenshot pairs were captured against commit `210ccf668bb26c551a3c88d1e8ee6ec8d245e117`: English home and initial quote at desktop 1440×900, tablet 768×1024 and mobile 390×844. All six comparisons were pixel-identical. Both variants blocked the same external fonts/images and reduced motion to make comparison deterministic. This establishes those two routes' controlled baseline preservation only; it does not verify actual external asset rendering, all quotation steps, French/Arabic layouts or animations.

To reproduce, serve the original baseline separately and the integrated frontend, set `BLIES_BASELINE_URL` and `BLIES_FRONTEND_TEST_URL` to those local origins, then run:

```sh
node tests/figma/visual-check.mjs
python3 tests/figma/compare-visual.py /tmp/blies-visual-results
```

The Python comparison requires Pillow. `BLIES_VISUAL_OUTPUT` can select a different capture directory; pass the same directory to the comparison script. Continue reviewing unchanged routes in English/French/Arabic, RTL behavior, navigation, animations, live images/fonts and functional loading/error states before signoff.

Functional changes include consent, document controls, real submission states, an account route/dashboard and authorized tracking access. Review those additions for consistency with existing components; no claim of pixel-identical account UI is possible because customer accounts were absent from the baseline. A screenshot of one route/width is not full responsive acceptance.

## Publication gate

Do not publish merely because local checks passed. Record the independently confirmed staging project, applied migration history, real permissions/Storage tests, real Auth/mail/scanner results, deployed origins, monitoring/backup recovery and visual acceptance. Resolve any **FAIL**, state remaining **BLOCKED** items plainly and obtain production deployment approval. Never use production customer data as a test fixture.
