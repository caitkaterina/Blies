# BLIES Vercel deployment guide

Use two projects. `BliesWebsite` is the final Figma Make frontend; `Blies` is the existing Next.js API and staff dashboard. Deploying the Next.js marketing pages as the public replacement website would discard the approved frontend and is not the selected architecture.

No live Vercel project configuration, Supabase migration, email sender or production deployment has been verified by this implementation. These are reviewable staging instructions, not a publication claim. Publication requires explicit approval after acceptance.

## Project settings

| Setting | Frontend website | Backend API and staff dashboard |
| --- | --- | --- |
| GitHub repository | `caitkaterina/BliesWebsite` | `caitkaterina/Blies` |
| Implementation branch | `feat/backend-integration` | `feat/end-to-end-integration` |
| Root Directory | Repository root (`.`) | Repository root (`.`) |
| Framework | Vite | Next.js |
| Node.js | 22.x | 24.x |
| Package manager | pnpm 10.34.3 | npm 11.x |
| Install command | `pnpm install --frozen-lockfile` | `npm ci` |
| Build command | `pnpm build` | `npm run build` |
| Output directory | `dist` | Framework default; do not set `dist`, `out` or static export |
| Public visitor pages | Existing React/Vite routes | Do not replace the frontend with these pages |
| Staff interface | No privileged staff proxy | Backend `/admin` on its own origin |

Keep the checked-in framework routing configuration. The frontend's serverless catch-all API proxy must take precedence over SPA fallback. A static-only host or `vite preview` alone does not supply that production proxy. Do not add an unrestricted catch-all proxy or allow the browser to choose arbitrary upstream URLs.

## Staging prerequisites

1. Confirm the actual Supabase project name/reference and whether it is staging using connected project information. The user-designated target is `BLIES` / `rwbzxycugebkleictweh`, not independently confirmed. Inspect conflicts, roles, policies, data counts and Storage before approving migrations. Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
2. Apply only the reviewed migrations to the approved staging database, verify grants/RLS/private Storage and save migration/backup records. Existing SQLite data and local files are not imported automatically.
3. Configure Supabase customer Auth verification/recovery templates and SMTP. Configure the actual scanner, Resend domain/key and approved staff scrypt/TOTP/session settings. Without those provider prerequisites, the corresponding flows remain blocked.
4. Use stable separate staging origins for the frontend and backend. Vercel's changing preview URLs are not an automatic origin allowlist. Keep staging and production credentials separate.

## Create and connect the two projects

1. In Vercel, import `caitkaterina/Blies` with repository root and the backend settings above. Use the implementation branch for an approved preview/staging deployment. Do not merge into or change the production branch as part of this step.
2. Add backend staging variables from [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md). Set `BLIES_STORAGE_MODE=supabase`; use the confirmed staging Supabase URL and server-only service key. Configure the backend's exact origin as `BLIES_SITE_URL` and the stable frontend staging origin in `BLIES_PUBLIC_ORIGINS`.
3. Import `caitkaterina/BliesWebsite` with repository root and the frontend settings above. Set server-only `BLIES_BACKEND_URL` to the approved HTTPS backend origin. Leave public `VITE_API_BASE_URL=/api` or omit it for the same default.
4. Redeploy after setting/changing variables. Browser calls to frontend `/api/...` are forwarded server-side to the backend. Customer cookies remain HttpOnly on the frontend host; provider keys/tokens never need to appear in a Vite variable or local storage.
5. Visit the backend's own `/admin` for staff login. Staff login/MFA/CSRF remain on that origin and are intentionally not forwarded through the public website proxy.

The backend verifies exact frontend origins and customer mutation headers even behind the proxy. Preserve `Origin`, cookies and the customer CSRF header in the approved proxy. Keep backend administrator same-origin checks separate. Do not enable credentialed cross-origin CORS to work around missing proxy/cookie configuration.

## Email dispatch

Business notifications use a persisted outbox. Configured providers get an immediate attempt through Next.js `after` after the business transaction and response; later failures remain durable for scheduled/manual retry. Configure Resend first and test accepted and rejected deliveries. An accepted form submission is not proof of email delivery. Use the protected staff notification action for manual draining (up to ten jobs), or an approved scheduler that sends `POST /api/internal/notifications` with `Authorization: Bearer <CRON_SECRET>` (up to five jobs). No automatic Vercel cron schedule is supplied; verify scheduler frequency, provider limits and retry behavior before relying on notifications.

Supabase verification and recovery mail is separate from the business outbox. Configure Supabase Auth SMTP and templates; a working Resend API key in the backend does not by itself configure Auth email.

## Domains and publication

Choose the business-approved website and backend domains; no domain ownership is assumed here. Attach the public website domain to the **frontend** project and the staff/API domain to the backend project. Enter only the DNS records Vercel shows for those actual projects and verify HTTPS. Update `BLIES_BACKEND_URL`, backend origins and Supabase Auth URL/template settings for the approved domains, then redeploy both projects.

Do not attach a production domain until staged acceptance succeeds and publication is approved. Confirm provider plan terms/capacity support the intended commercial deployment. Preserve the existing Figma assets, fonts, styles, multilingual presentation and responsive design; review necessary functional form/account additions against the original.

## Deployment acceptance

Execute [TESTING_AND_ACCEPTANCE.md](TESTING_AND_ACCEPTANCE.md) against isolated staging records before publication. Confirm:

- Both projects build with pinned runtimes and lockfiles.
- `/api/health` returns the expected service/configuration flags without secrets; separately test actual provider calls because those flags check presence, not connectivity.
- Frontend `/api` calls reach the expected backend and rejected upstream/origin paths fail closed.
- Contacts/quotes persist across new sessions and redeployment; idempotent retries preserve a single reference.
- Customer verification, sign-in, refresh, recovery and logout use real Auth and protected cookies.
- Two test customers cannot read each other's requests, tracking records or documents.
- Staff MFA and roles work, changes persist, and audit entries exist.
- Scans occur before private uploads; unauthorized downloads fail; authorized signed links expire.
- Email jobs survive provider rejection, send through the approved provider and do not duplicate during supported retries.
- Desktop/mobile pages match the approved Figma design except documented functional states/additions.

Unit tests, stub schemas, browser contract fixtures and successful builds do not establish these live properties.

## Rollback

Before release, record approved deployment IDs, Git commits, schema migration history and backup/recovery options. If deployment fails, stop promotion and retain the prior deployment. Use Vercel's deployment rollback/promote controls for the last accepted version and revert the code change in a reviewable Git commit when needed.

Rolling back application code does **not** roll back Supabase schema or data. Do not drop tables, buckets or customers to restore the site. Additive schema changes may be compatible with an older version, but verify that version's contracts first. Database recovery requires a separately approved backup/restore or forward-fix plan. Retry/drain pending notification jobs only after diagnosing a failure; never delete them to hide delivery problems.

## Frontend security headers

`BliesWebsite/vercel.json` adds nosniff, referrer/frame/permission protections and a CSP allowing the existing Google fonts, Unsplash images and same-origin API calls. It leaves framework/output settings intact. Direct external `VITE_API_BASE_URL` use requires a separately reviewed CSP connect-src addition; customer sessions use the same-origin proxy. Verify the actual headers and asset loading on the approved preview; local Vite does not simulate Vercel headers.

## Offline staff bootstrap

The backend includes `scripts/bootstrap-admin.mjs`. Run it locally on a trusted machine with Node 24 and a NEW protected file outside the checkout. It does not print secrets or overwrite files. This is optional initialization for the preserved staff authentication, not creation of Supabase Auth administrators. Do not run it against existing deployment settings or rotate them without approval.

```sh
read -rs -p "New staff password: " BLIES_BOOTSTRAP_PASSWORD
printf '%s' "$BLIES_BOOTSTRAP_PASSWORD" | node scripts/bootstrap-admin.mjs APPROVED_ADMIN_EMAIL /absolute/protected/path/settings.env
unset BLIES_BOOTSTRAP_PASSWORD
```

Use a unique password of at least 14 characters; replace the email/path placeholders. Enrol the generated TOTP secret in the administrator's authenticator using a protected local view, then enter those four settings directly into protected Vercel settings. Store the file in an approved password manager or securely remove it after enrollment/verification. Never paste its contents into chat, tickets or Git. A local automated test verifies permissions, no password output and overwrite refusal using isolated dummy input.
