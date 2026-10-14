# BLIES environment variables

The website remains `caitkaterina/BliesWebsite` (React/Vite). The API and staff dashboard remain `caitkaterina/Blies` (Next.js). Configure each Vercel project separately. Values belong in Vercel's protected environment settings or a gitignored local environment file, never in chat, source code or these documents.

All Vercel variable changes require a new deployment to take effect. Restart local development processes after changes. Separate staging and production keys, Supabase projects, staff accounts, scanner configuration and email settings. Preview deployments must not inherit production persistence credentials.

## Frontend project: BliesWebsite

| Exact name | Classification | Requirement and environments | Source and purpose |
| --- | --- | --- | --- |
| `BLIES_BACKEND_URL` | Server-only configuration; not a secret | Required for staging/production API proxy; required for local integrated development | Exact approved backend origin, e.g. `https://<backend-staging-domain>` with no path, query or trailing slash. Obtain from the backend deployment. Vercel's API function and the Vite development proxy use it; browsers do not receive this variable. Local development may use `http://localhost:3000`. |
| `VITE_API_BASE_URL` | Public, bundled at build time | Optional; keep `/api` in all supported customer-account deployments | Default `/api`. Requests use the website's own origin and reach the backend through the server proxy. A direct cross-origin value is not the supported customer-cookie architecture. No key belongs here. |

Keep Figma's existing development/build variables when that environment supplies them. `PORT`, `FIGMA_PUBLIC_URL` and `FIGMA_DEV_SERVER_HOST` are scaffold/runtime settings, not backend credentials. They are not required to connect the Vercel production website. Do not introduce `VITE_SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_*` secrets or a browser database client.

## Backend project: Blies

| Exact name | Classification | Requirement and environments | Source and purpose |
| --- | --- | --- | --- |
| `BLIES_STORAGE_MODE` | Non-secret server configuration | Required as `supabase` on staging/production Vercel | Selects managed persistence after approved migrations. `sqlite` is supported for durable local development only. Vercel fails closed instead of writing business data to an ephemeral filesystem. |
| `BLIES_SUPABASE_URL` | Public project identifier, server configuration | Required for managed persistence and customer accounts | Confirmed Supabase project's exact `https://<project-ref>.supabase.co` origin. Custom domains/self-hosted URLs and trailing slashes are not accepted by the current adapter. |
| `BLIES_SUPABASE_SERVICE_ROLE_KEY` | **Server-only privileged secret** | Required for managed staging/production | Obtain from the confirmed Supabase project's API settings. Used for server PostgREST RPCs and private Storage. It bypasses RLS; never give it to the frontend project, browser bundle or public environment variables. Current bearer/API-key compatibility must be live-tested. |
| `BLIES_SUPABASE_ANON_KEY` | Supabase public API credential, used server-side here | Required for customer Auth | Obtain from the same project's API settings. The backend uses this with GoTrue; the frontend does not need it. This key supplies no administrator role or private-record permission. |
| `BLIES_SITE_URL` | Non-secret URL | Required per environment | Exact backend origin, not the public frontend origin. Used for staff same-origin validation and backend metadata. Local default is `http://localhost:3000`. |
| `BLIES_CUSTOMER_SITE_URL` | Public URL, server configuration | Required for customer verification/recovery | Exact approved frontend origin with no path or trailing slash. Set to the website, not the staff backend. Use it consistently with Supabase Auth Site URL, allowlisted redirects and email templates. |
| `BLIES_PUBLIC_ORIGINS` | Non-secret allowlist | Required for integrated frontend requests | Comma-separated exact approved frontend origins, including the actual staging site. No wildcards, path prefixes, credentials or arbitrary Vercel preview suffixes. Add approved stable preview domains explicitly. |
| `BLIES_SESSION_SECRET` | **Server-only signing secret** | Required for staff operations | Cryptographically random value with at least 32 characters, generated privately. Signs the existing one-hour staff session. A change invalidates staff sessions and requires redeployment. |
| `BLIES_ADMIN_EMAIL` | Restricted staff identity | Required together with administrator hash/TOTP unless staff JSON defines administrators | Approved administrator email. This is not the notification recipient setting. |
| `BLIES_ADMIN_PASSWORD_HASH` | **Server-only credential material** | Required with `BLIES_ADMIN_EMAIL`/TOTP | Privately generate `scrypt:<random-salt>:<128-character-hex-hash>` using Node's `scryptSync(password, salt, 64)`. Do not store a plaintext password or reuse test credentials. |
| `BLIES_ADMIN_TOTP_SECRET` | **Server-only MFA secret** | Required with administrator email/hash | Generate a private random Base32 secret with at least 80 bits and securely enrol the approved administrator's authenticator. Never disable MFA to complete integration. |
| `BLIES_STAFF_ACCOUNTS_JSON` | **Server-only secret collection** | Optional additional staff identities | Protected JSON array of `{email,role,passwordHash,totpSecret}`. Roles are `admin`, `editor`, `sales`. Use unique credentials and MFA per person. Removing/changing a role invalidates the old session through runtime role checks. |
| `BLIES_SCAN_URL` | Server-only provider configuration | Required for document uploads in every environment | Real approved HTTPS scanner endpoint accepting raw bytes and returning a verified `{ "clean": true }` result. Missing/unusable scanning blocks uploads. |
| `BLIES_SCAN_KEY` | **Server-only secret** | Required with the scanner URL | Obtain from the scanner provider; sent only by the backend. Local contract fixtures do not replace production malware scanning. |
| `BLIES_EMAIL_API_KEY` | **Server-only secret** | Required for actual business email delivery | Resend API key, restricted to the approved sending domain where supported. Without it, email is not sent. Supabase Auth email uses separate provider/SMTP dashboard configuration. |
| `BLIES_EMAIL_FROM` | Non-secret sending identity | Required with email API key | An address on an actually verified Resend domain. Neither these documents nor the implementation verify a sender/DNS record. |
| `BLIES_ADMIN_NOTIFY_EMAIL` | Restricted internal contact configuration | Optional business-event notifications | Approved internal recipient address. Configure deliberately; do not assume `BLIES_ADMIN_EMAIL` is a shared business mailbox. |
| `CRON_SECRET` | **Server-only secret** | Required only when using the internal email dispatcher | Random restricted bearer credential for `POST /api/internal/notifications`. Supply it to an approved external scheduler; no automatic Vercel cron is configured. MFA/CSRF-protected manual draining remains available to staff. |
| `BLIES_DATA_DIR` | Server-only filesystem path | Local SQLite only | Durable private directory outside the checkout, default `/workspace/blies-private`. It is not a production Supabase or Vercel storage setting. |
| `BLIES_TRUST_PROXY` | Security-sensitive configuration | Optional; default `false` | Set `true` only when a controlled gateway removes incoming `X-Real-IP` and installs a trusted value. Do not enable merely because Vercel acts as a proxy. Global/account rate limits still apply. |
| `BLIES_LAUNCH_APPROVED` | Non-secret release gate | Keep `false` on staging; production requires business approval | Existing backend content/indexing gate. It is not evidence that the frontend, providers or security have passed acceptance. |
| `BLIES_ANALYTICS_DOMAIN` | Public analytics identifier | Optional, subject to existing consent handling | Approved analytics domain, if used by the backend's existing marketing pages. Not required for Figma frontend/API integration. |

`NODE_ENV`, `VERCEL`, `VERCEL_ENV` and platform routing variables are supplied by the hosting platform. Do not spoof them to bypass storage restrictions. There is no `DATABASE_URL` or pooler credential required by this adapter: database operations use bounded HTTPS requests to Supabase PostgREST. Supabase CLI credentials used for reviewed migrations are deployment tooling credentials and must not become application environment variables.

## Dashboard configuration that is not an environment variable

- In Supabase Auth, enable email verification, set the frontend staging URL/allowed callbacks, and configure verification/recovery templates using the backend-supported `token_hash` callback flow. Configure real SMTP for delivery and test it.
- In Supabase Storage, verify `blies-private` is private, object limits/types match the code, and no existing broad object policy permits visitor access.
- In Resend, verify the sender domain and DNS, then use protected Vercel settings for its key.
- In Vercel, set the backend runtime to Node 24 and frontend runtime to Node 22, and scope variables independently to Preview and Production.

The user-designated target is `BLIES` / `rwbzxycugebkleictweh`; actual project ownership, staging status and configuration remain unverified until connected read-only inspection. Do not use it for migrations or deployment solely because its reference appears here.

## Developer/test configuration

`BLIES_FRONTEND_REPO` can override the sibling frontend checkout location for backend `test:figma`; it is optional local test configuration, not a deployment variable. `BLIES_FRONTEND_TEST_URL`, `BLIES_BASELINE_URL` and `BLIES_VISUAL_OUTPUT` select local UI/baseline/output locations for the explicit browser/visual scripts. The Playwright configs create isolated `BLIES_TEST_*` credentials/directories in memory for tests only. Never copy those generated fixtures into Vercel or production.

Frontend `packageManager` pins pnpm 10.34.3. Enable Corepack in Vercel if its package-manager setup requires it; use the checked-in pin and frozen installation, not an arbitrary global pnpm version. Changes to public `VITE_` configuration need a new frontend build. Server settings also need redeployment; files or saved instructions alone do not apply runtime configuration.
