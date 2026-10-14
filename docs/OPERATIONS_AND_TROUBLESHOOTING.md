# BLIES operations and troubleshooting

The public site is the Figma React/Vite project. The Next.js backend owns persistence, customer-provider calls, protected staff workflows, documents and business-email delivery. Use the correct project's logs and environment settings; changing frontend styles or replacing the site is not a database fix.

## Safe diagnosis

Before an operation, check the deployment environment, actual frontend/backend origin and Supabase reference in the dashboard. The nominated `BLIES` / `rwbzxycugebkleictweh` project has not yet been independently confirmed as staging. Production credentials must never be used for local fixtures or previews.

Record deployment ID, commit, route, response status/code, timestamp and non-sensitive reference. Do not dump process environments, provider request headers, enquiry payloads, cookies, passwords, tokens, scanner keys or signed URLs. Keep tracing/screenshot access restricted; a URL containing a verification token or private download signature is sensitive.

Use Vercel build/runtime logs per project, Supabase database/Auth/Storage logs, Resend delivery events and the approved scanner's logs. Audit rows document staff/customer-sensitive actions; application logs do not replace that audit trail. Redact customer data before sharing diagnostics.

## Symptoms and next checks

| Symptom | Likely cause and safe diagnosis |
| --- | --- |
| Backend build fails | Use Node 24/npm 11, `npm ci`, repository root and `npm run build`. Inspect the first actionable error and lockfile/toolchain mismatch; do not regenerate dependencies merely to silence errors. |
| Frontend build fails | Use Node 22/pnpm 10.34.3 and `pnpm install --frozen-lockfile`. Run `pnpm exec tsc --noEmit`. Preserve existing Figma plugins/styles; inspect the actual failing import/type. |
| `/api` returns frontend HTML or 404 | Frontend serverless proxy is missing/shadowed by SPA routing, or deployment is static-only. Confirm framework/root/output and `/api` routing. `vite preview` does not supply Vercel's API function. |
| Proxy returns unavailable | Check frontend `BLIES_BACKEND_URL` is the exact approved HTTPS backend origin, without path/query. Check upstream deployment and protected-network access. Redeploy after changing variables. Do not make the upstream browser-controlled. |
| `BACKEND_UNAVAILABLE` / 503 | Inspect backend storage mode, supported Supabase origin, key presence/status, migrations/RPC signatures and provider connectivity. Vercel intentionally refuses SQLite/local files. Do not change mode to `sqlite` to make managed production appear healthy. |
| Public/customer mutation returns 403 | Check browser Origin equals an exact frontend allowlist entry, proxy preserves it, and frontend sets `X-BLIES-CSRF: 1`. Keep `/api` same-origin for customer cookies. Do not add wildcard origins or disable CSRF. |
| Staff mutation returns 403 | Use backend `/admin`, valid staff role/session and existing `x-csrf-token`. `BLIES_SITE_URL` must match that backend origin. Customer headers/cookies do not grant staff access. |
| Staff login unavailable/fails | Verify protected staff email/hash/TOTP settings and signing secret presence without printing them. Check clock alignment, unique enrolment, current one-hour session and durable rate limits. Replayed TOTP is intentionally denied. |
| Customer cannot sign in | Inspect actual Supabase Auth settings and verified email status, backend anon key/project pairing and GoTrue logs. An unverified user is intentionally rejected. Preserve generic errors to avoid account enumeration. |
| Sign-out reports provider unavailable | Local customer cookies are cleared, but provider-side revocation may remain unverified during an outage. Inspect Auth status and retry the approved revocation workflow; do not claim provider sessions were revoked merely because local UI signed out. |
| Verification/recovery opens wrong page | Check `BLIES_CUSTOMER_SITE_URL`, Supabase Site URL/redirects and token-hash templates. Callback must target frontend `#/en/account` (or approved locale); default provider access-token fragments are not this flow. Test expired/used links and SMTP delivery separately. |
| Customer appears signed out after refresh | Inspect forwarded `Set-Cookie`, Path `/api`, HttpOnly/Strict/Secure, HTTPS origin and refresh flow. Tokens must not move to local storage to work around a missing proxy. |
| Customer history is empty | Confirm server-verified UUID owns the record. Guest submissions remain unowned and are not linked by email; another customer's data must stay hidden. Check whether the returned recent-record cap excludes older data. |
| Tracking lookup is empty | Lookup requires a verified account and an owned stored shipment. Existing tracking form submissions are enquiries, not fabricated shipment histories. Staff must create a genuine shipment for the intended customer. |
| Upload rejected/unavailable | Verify max three PDF/JPEG/PNG files, 2 MiB combined in managed mode, signatures, real HTTPS scanner and key. Scanner failures fail closed. Do not skip scanning or increase limits beyond Vercel/request/bucket constraints. |
| Authorized document download fails | Confirm document ownership/staff role, private UUID object existence and Storage signing permission. Signed URLs last 60 seconds and are bearer credentials; issue a fresh authorized link instead of making the bucket public. |
| Accepted request but no email | Submission success means committed records. Inspect durable outbox, Resend verified sender/key, retry age/attempts and provider response. Supabase Auth mail uses separate SMTP/template settings. |
| Duplicate submission conflict / 409 | Reuse a key only for the same unchanged payload. A changed payload must use a new key. A request in progress may be busy; avoid an uncontrolled automatic retry loop. |
| Database update/audit fails | Inspect RPC/grants/constraints and existing object conflicts. Sensitive actions fail closed if the required write/audit cannot complete. Do not disable audit to allow the action. |

## Email dispatch and reconciliation

Configure the two email paths separately before live acceptance:

1. In Resend, add the actual BLIES-approved sending domain. Enter the exact DNS records the provider gives in the domain's DNS dashboard and wait for verified status; no domain/DNS ownership is assumed by this code.
2. Create a sending credential with the narrowest available permissions/domain scope. Save it only as backend `BLIES_EMAIL_API_KEY` in the intended Vercel environment; set `BLIES_EMAIL_FROM` to the verified sender. Add `BLIES_ADMIN_NOTIFY_EMAIL` only for an approved internal recipient.
3. In Supabase Auth, configure SMTP using approved provider credentials in the Supabase dashboard, enable email verification, and apply the token-hash signup/recovery templates in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Backend business-email settings do not configure Auth SMTP.
4. Use isolated staging accounts to verify confirmation/recovery delivery, provider acceptance/rejection, sender identity and actual mailbox arrival. Review spam/bounce/suppression events; provider acceptance alone is not delivery.
5. Schedule the protected outbox dispatcher only after those checks or deliberately use administrator manual draining. Monitor failed/aged jobs, provider limits and domain status before publication.

New business records and required notification jobs commit together. Configured providers get an immediate post-response attempt through Next.js `after`; failures remain durable for retry. Approved administrators can manually drain through the dashboard's protected notification action. An external scheduler can call `POST /api/internal/notifications` using a secret bearer credential; do not place that credential in browser requests, URLs or public cron documentation.

The dispatcher uses stable Resend idempotency keys, token-fenced five-minute delivery leases, parallel bounded sends and backoff. A stale worker cannot finalize another worker's delivery claim. Automatic attempts are bounded at eight and restricted to 23 hours after job creation, below the provider's 24-hour idempotency period. A successful HTTP response means provider acceptance, not guaranteed inbox placement. Missing provider settings are reported as not configured; no mail success is invented.

Inspect exhausted/aged jobs before a deliberate resend; retain their audit/provider evidence. A retry outside the provider's deduplication window may send twice, so do not blindly reset attempts/creation time. If provider acceptance succeeded but updating delivery state failed, reconcile using the provider's event history and original job ID. Do not delete pending jobs to hide failures.

## Storage reconciliation and backups

Storage upload and metadata commit are separate systems. Best-effort cleanup after a failure can leave a private orphan file. Compare stored object IDs with document metadata in a restricted staging review; do not expose a public object listing. Delete only proven orphan objects through a separately approved procedure, after confirming active submissions cannot still reference them.

Keep encrypted, access-controlled database backups and independent Storage-byte backups. Test restoring both and reconnecting metadata before production approval. These migrations do not export/import an existing SQLite installation. Preserve any legacy data/files until a reviewed import and reconciliation is complete.

## Staff account bootstrap and changes

Use the existing staff design: approved identity, a strong unique password hashed privately with Node `scryptSync`, a unique securely generated/enrolled Base32 TOTP secret and a random session secret of at least 32 characters. Save only hash/TOTP/signing material in protected backend Vercel settings; do not create default credentials, browser-visible staff tables or Supabase customer roles that grant administration.

Hash format is `scrypt:<random-salt>:<128-character-hex-hash>`, derived with `scryptSync(password, salt, 64)`. Generate it offline without echoing the password or putting it in a shell command/history. Use an approved password manager/secure enrolment process for the original credential and authenticator. Additional `BLIES_STAFF_ACCOUNTS_JSON` identities require unique credentials and the least required `admin`, `editor` or `sales` role. Redeploy after changes. Removing/changing a role invalidates the runtime session; signing-secret rotation invalidates all staff sessions and requires planned approval.

## Failed deployment and recovery

Stop promotion if a required check fails. Retain the previous accepted Vercel deployment and its exact commit/settings. Roll back the affected application deployment through Vercel controls, then prepare a reviewed Git revert/forward fix. Do not force-push branches or merge unreviewed fixes into production.

Application rollback does not reverse database migrations. Do not drop populated tables, policies, buckets or users in an incident. Verify compatibility with the existing schema; use an approved forward fix or tested backup recovery. Preserve evidence, pending mail and private document references. Keep preview/staging environments isolated while diagnosing the production incident.

## Known reliability boundaries

Configured business mail gets a bounded immediate attempt after the response through Next.js `after`. Configure the protected external scheduler for traffic-independent retry; never rely on a live process surviving serverless invocation. Workers claim jobs with a persisted lease and token, use a stable provider idempotency key, and fence delivery-state updates. Rows older than 23 hours or exhausted retries need explicit operator review rather than automatic resend beyond the provider's deduplication window.

On a submission timeout, retry the same unchanged form attempt; do not assume failure means no record exists. The backend resolves uncertain commits under a submission-row lock and cancels the token before safe cleanup. It retains private files when the outcome cannot be established. Reconcile orphan objects using metadata references and approved retention controls; do not mass-delete by filename or age without review.

Guest records are never automatically claimed merely because the customer registers with a matching email. SQLite development does not invent an Auth user directory or provider email lookup for shipment notifications; that production notification path is the PostgreSQL trigger against verified Auth identities.
