# BLIES Supabase setup and inspection

The user has designated **BLIES** with reference **`rwbzxycugebkleictweh`** as the intended staging target. That is a user-supplied identification, not an independently confirmed account/project inventory. Live project metadata, staging status, migration history, roles, schema, existing customer data, Auth settings and Storage configuration remain unverified. No live migration has been applied by this implementation.

## Inspect before changing anything

Use a connected Supabase account with read access to confirm the project name, reference, owner/organization and staging purpose. Do not infer staging from the name. Compare the reference shown by the dashboard/management connection with the nominated reference. Keep inspection read-only until the findings and migration plan are approved.

Record the following without exporting customer records or secrets:

- PostgreSQL version, exposed API schemas, tables/views, constraints, indexes and function signatures.
- Supabase migration history and whether any of this repository's migrations already exist.
- Names/counts of existing business records and conflicting objects. Do not dump enquiry JSON, passwords or Auth identities into reports.
- Effective grants, default privileges, role memberships, RLS status, policies and function security/search paths.
- Storage bucket IDs, privacy flags, size/type restrictions and every applicable `storage.objects` policy, including broad policies on other buckets.
- Auth email-verification setting, redirect allowlist, SMTP configuration status and existing workflows that could conflict with the customer templates.
- Current backups/PITR capability, retention and a tested recovery route. Database backups alone are not a backup of Storage object bytes.

These example catalog queries do not modify data; execute them only in the confirmed target and do not forward sensitive results:

```sql
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema IN ('public', 'storage', 'supabase_migrations')
ORDER BY table_schema, table_name;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

SELECT n.nspname AS schema, c.relname AS relation,
       c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public', 'storage') AND c.relkind IN ('r', 'p');

SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema IN ('public', 'storage')
ORDER BY table_schema, table_name, grantee, privilege_type;

SELECT n.nspname AS schema, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY p.proname;

SELECT rolname, rolcanlogin, rolsuper, rolbypassrls
FROM pg_roles ORDER BY rolname;

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets ORDER BY id;
```

Inspect migration history after confirming its table exists. Review role membership/default grants as well as these direct table grants. Inspect relevant function definitions in a secure review context, particularly any existing Storage signing or `SECURITY DEFINER` functions.

## Version-controlled schema

Apply the files in order through a reviewed Supabase migration workflow, only after target inspection and approval:

1. `supabase/migrations/202610130001_backend.sql`: enquiries/contact/quotation/tracking views; private document metadata; CMS content/version history; audit records; durable limits; restricted transactional RPCs; private `blies-private` bucket.
2. `supabase/migrations/202610140001_customers_shipments.sql`: customer ownership through `auth.users`, scoped customer-read policies/projections, shipments and event history, restricted shipment RPCs. Replaces the original create-enquiry function with a compatible optional ownership argument.
3. `supabase/migrations/202610140002_delivery.sql`: durable submission idempotency and business-email outbox/delivery functions used by the integrated application.

Migrations are applied once and recorded in migration history. Do not rerun a file manually to make an error disappear. The initial migration intentionally creates objects rather than silently replacing unknown tables or data; conflicting names/bucket IDs require a reviewed resolution. The customer migration changes the enquiry function signature, so account for existing dependencies and PostgREST's schema cache in staging. Existing migration history can differ from these names; do not mark remote migrations as applied without comparing their contents/effects.

The application uses PostgREST RPCs and HTTPS Storage/Auth calls, not a long-lived SQL connection or local PostgreSQL socket. No database pooler password is required by the runtime. Requests have bounded timeouts and no managed-mode filesystem fallback. Configure the exact supported Supabase origin and matching server service/anon credentials using [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

## Permissions and ownership

- Business tables enable RLS. Anonymous visitors cannot directly read customer records or execute privileged RPCs. Approved public enquiries are validated by the backend and committed transactionally.
- Verified customer identities come from GoTrue `/user`; the server derives their UUID. Browser-submitted IDs and matching email addresses do not establish record ownership.
- Authenticated database reads are limited by owner policies and column grants. Staff assignment/replies, Storage keys, internal delivery metadata, audits and limits remain server-only.
- The backend service role bypasses RLS. Every protected route must enforce customer ownership or staff roles before using it; RLS is additional protection, not a replacement for these checks.
- Existing staff authentication stays in protected runtime settings with scrypt passwords, TOTP, signed one-hour sessions, role checks and CSRF. Supabase customer Auth does not grant staff access.
- Existing guest enquiries remain unowned. Do not bulk-link them to a customer based on email. Any record-claim/import workflow needs a separately reviewed identity-verification plan.

Test negative permissions with the real anonymous/authenticated credentials and two staging test customers: another customer's table rows, RPC writes, audits, internal columns and documents must be inaccessible. Positive service writes/customer reads must still work. Review inherited/default privileges; an object-level revoke does not establish that every existing permission is safe.

## Private Storage

The bucket is `blies-private`, `public=false`, with PDF/JPEG/PNG types and a 2 MiB object limit. Managed submissions allow at most three files and **2 MiB combined file bytes**, plus bounded multipart overhead. The backend checks signatures, scans real bytes before upload, uses generated UUID keys, and does not overwrite objects.

No direct browser upload/read/sign/delete policy is required by this architecture. A private bucket flag alone does not defeat an existing broad `storage.objects` policy. Inspect and test every applicable policy before approval; do not overwrite an unknown project's policies automatically.

Customer downloads verify request ownership; staff downloads require the proper role and audit event. The account page requests a refreshed authorized JSON download URL through `/api/customer/documents/[id]?format=json`; the default route still supports redirect/binary behavior. The server issues 60-second signed attachment URLs. Treat each URL as a temporary bearer credential and never log it. Scanning takes place during upload, not each download. Test unauthorized object access, signing/deletion denial, actual expiry, scanner rejection and metadata/storage failures. Storage and PostgreSQL cannot share a transaction; failed cleanup may leave private orphan objects for a reviewed reconciliation procedure.

## Customer Auth and email prerequisites

Enable email confirmation and configure actual SMTP. Set the frontend staging origin as the Auth Site URL and allow only approved callback origins. `BLIES_CUSTOMER_SITE_URL` must identify the same website origin. The backend supports token-hash verification, not browser-persisted provider tokens. Configure email templates to open the website account route with the provider's token hash/type:

```text
https://<approved-frontend-origin>/?token_hash={{ .TokenHash }}&type=signup#/en/account
https://<approved-frontend-origin>/?token_hash={{ .TokenHash }}&type=recovery#/en/account
```

The backend's `redirect_to` is `${BLIES_CUSTOMER_SITE_URL}/`, so the equivalent Supabase template can use `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup#/en/account`, with `type=recovery` for reset mail. The query must precede the hash-router fragment. Use the appropriate verified locale route and provider-supported template syntax; test both templates with isolated accounts. The frontend sends the hash to the backend for GoTrue verification and removes callback material from the URL. Provider access/refresh tokens belong in HttpOnly cookies, not the JavaScript URL/local storage. Configure anti-abuse settings and provider email limits in addition to application rate limits. Never grant administrator rights through customer-editable metadata.

## Backup, migration and recovery gate

Before approval, capture the schema/grants/migration state and provider-supported backup. Confirm how Storage bytes are backed up separately and how restore has been tested. Identify any real SQLite enquiries, documents or CMS records before switching providers; these migrations do not import them.

Review expected object creation and function replacement, conflicts, transaction boundaries and data-retention obligations. Apply to staging first, record the exact migration/checksum and verify data survives new sessions and redeployment. Run live acceptance before considering a production migration. Production changes require explicit authorization and a production-specific inspection/backup plan.

There is no automatic down migration. Do not drop populated tables or buckets to roll back. Prefer compatible application rollback or an approved forward fix; restore data only through a deliberate recovery procedure. PGlite schema tests and mocked HTTP tests cannot verify a real Supabase project's policies, grants, API cache, Storage or Auth email.

## CLI execution after approved inspection

The preparation branch adds `supabase/config.toml`; no hosted project is linked. Review [SUPABASE_GITHUB_PREPARATION.md](SUPABASE_GITHUB_PREPARATION.md) before connecting GitHub: automatic preview branching can apply migrations even with production deployment disabled. Keep both disabled during preparation.

On a trusted operator machine, install the official Supabase CLI, authenticate securely, and only after independently confirming staging and approving the tooling phase run from the backend repository:

```sh
supabase link --project-ref rwbzxycugebkleictweh
supabase migration list
supabase db push --dry-run
```

Do not rerun `init` over the prepared configuration. A successful dry run is not permission to apply. Compare migration history and SQL, confirm database and object backups, then apply only after the approved staging plan using `supabase db push`. Choose one reviewed executor for a target: do not concurrently use GitHub automation and manual CLI pushes. Do not place CLI access tokens/database passwords in source or chat. Do not use `migration repair` to bypass unknown history or conflicts. If using SQL Editor instead, record the executed versions through the reviewed migration workflow rather than pretending an Editor run automatically maintains CLI history. These commands have not been executed against the nominated project.
