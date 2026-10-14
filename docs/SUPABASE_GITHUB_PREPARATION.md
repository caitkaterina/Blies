# BLIES Supabase GitHub integration: preparation and approval

This is a proposed repository configuration, not authorization to connect, create a hosted branch, apply migrations, change settings, merge or deploy. The nominated base project is `BLIES` / `rwbzxycugebkleictweh`; account identity, ownership and staging isolation remain independently unverified. No Supabase inspection tools or usable project credentials were available in this session. No SQL has been executed against that project.

## Proposed changes

Prepared locally on `feat/supabase-github-preparation`, based on backend commit `64ac223237b702385184773ddc520d25e7798284`. Nothing has been pushed, merged or deployed. The frontend is unchanged.

- `supabase/config.toml`: local identifier `blies-backend`, versioned migrations enabled, declarative schema paths empty, seeding disabled with no seed paths. The identifier does not link a hosted project.
- `supabase/.gitignore`: excludes CLI link/cache/branch state and environment files.
- `supabase/inspection/readiness.sql`: proposed catalog SELECT queries inside a read-only transaction ending in ROLLBACK. It is outside `migrations/`, so the migration runner does not execute it. It has not been executed on Supabase.
- This guide and an updated link/tooling note in `SUPABASE_SETUP.md`.

No live `[remotes.*]` mapping, hosted PostgreSQL version, Auth/SMTP/API-schema override, Edge Function declaration or duplicate Storage bucket configuration is introduced. Effective inherited/default provider settings still require inspection. No keys, passwords, staff accounts or sample customer records are committed. This TOML file is not a release lock: GitHub integration controls must separately remain disabled until approved.

## Dashboard fields after approval

| Field | Value / decision |
| --- | --- |
| Repository | `caitkaterina/Blies` |
| Working directory | `.` (parent of `supabase/`) |
| Production branch | `main`, proposed future release branch; existing deployment mapping is unverified |
| Deploy to production | **OFF** |
| Automatic branching | **OFF during preparation**; enabling later requires explicit approval for preview creation/migrations |
| Supabase changes only | **ON when automatic branching is eventually approved**, to limit branch creation to relevant changes |
| Enable integration | **Do not click during this phase** |

The backend's remote `main` does not currently contain `supabase/`. The implementation branch `feat/end-to-end-integration` contains the three migrations; this preparation branch adds configuration. A production-branch selector does not substitute feature-branch contents into `main`. Resolve the reviewed Git/PR workflow before connecting; do not merge just to satisfy setup. `BliesWebsite` remains the React/Vite frontend, not the Supabase migration repository.

## What enabling integration can do

Official Supabase documentation says GitHub integration watches commits, branches and pull requests. With automatic branching enabled, matching Git branches can create Supabase preview branches. These are **write operations**, even with production deployment disabled.

Preview branches inherit base-project configuration and Edge Functions. Their database schema is built from repository migrations, rather than copied from the base project's application schema. Base data and Storage objects are not copied. Therefore a clean preview passing migrations does not prove that those same migrations are compatible with existing base-project data/objects.

At creation, preview branches apply committed migration files in version order. Later commits apply unapplied migration versions; edits to a previously applied migration are not a reliable upgrade mechanism. Branching wraps each migration file in a transaction. The three files already contain BEGIN/COMMIT; verify the actual executor's transaction and migration-history behavior on a disposable approved preview before relying on rollback. Nothing in this phase runs that provider test.

Configuration declared in `config.toml` is applied over preview configuration. This file disables seed execution; no seed data is supplied. `blies-private` is created by SQL migration 001, not by a second TOML bucket declaration. Inspect inherited Storage policies, Auth settings and Edge Functions before preview creation; avoid inherited production SMTP, webhooks or other external effects.

With **Deploy to production ON**, pushes/merges to the selected production branch can apply new migrations, deploy declared Edge Functions and deploy declared Storage buckets. API/Auth/seed configuration is ignored by default for production according to the documentation; explicit remote configuration requires a separate review. Keep production deployment OFF. The term "production" in this dashboard means the connected base project; it does not independently classify that project as BLIES business staging or production.

This integration does not deploy the Vite website or Next.js server, import SQLite/files, establish staff accounts, configure Vercel secrets, or prove Auth/Storage/mail/scanner connectivity. Do not push this preparation branch until existing Supabase/Vercel automatic deployment settings have been checked or an approved safe review workflow exists.

## Review of the three unchanged migrations

| File | Objects and checks |
| --- | --- |
| `202610130001_backend.sql` | Creates `public.enquiries`, `documents`, `content`, `versions`, `audit_records`, `limits`; contact/quotation/tracking views; six restricted RPCs; private bucket `blies-private` (2 MiB per object, PDF/JPEG/PNG). Plain CREATE/INSERT fails on conflicting names/bucket IDs. Requires PostgreSQL 15+ for security-invoker views and the Supabase roles/Auth/Storage infrastructure. |
| `202610140001_customers_shipments.sql` | Adds `enquiries.customer_id` referencing `auth.users`, owner policies/customer view, shipments/events and RPCs. Drops five-argument `blies_create_enquiry(text,text,text,jsonb,jsonb)` and creates an optional-owner six-argument replacement. Inspect dependencies/overloads/external callers/PostgREST cache. Existing guest rows remain unowned; email matching is not ownership. Auth-user foreign keys can block deletion of referenced users. |
| `202610140002_delivery.sql` | Creates `submission_keys`, `email_outbox`, restricted reliability/delivery RPCs and two notification triggers. Drops five-argument `blies_update_record(text,text,text,text,text)` and replaces it with a six-argument version with optional notification flag. `blies_shipment_event_email()` is SECURITY DEFINER, reads `auth.users.email`, has fixed search path and revoked direct execution; its owner/effective privileges must be inspected. SQL queues mail; it does not itself call an email provider. Later configured application/worker activity can send jobs. |

The migrations are unchanged so unknown remote migration history is not rewritten. No DROP TABLE, TRUNCATE, automatic data import or automatic email-based guest claim is present. No actual remote conflict has been confirmed or ruled out.

Security gates:

1. The first migration's table/view REVOKEs omit PUBLIC. Review default ACLs, memberships and effective privileges; prepare explicit PUBLIC hardening if required. Do not assume column restrictions remain effective under broader inherited grants. Existing applied migration versions must not be edited to deliver a fix; use a reviewed forward migration.
2. Inspect every applicable `storage.objects` policy and signing/definer function. `public=false` does not negate broad authenticated/anonymous object policies. No browser upload/read/sign/delete policy is needed by this server-mediated architecture.
3. Owner-level database grants expose the whole `enquiries.data` JSON value; the backend's response allowlist does not constrain direct database reads. Review existing/imported JSON for internal material and design a safe database projection if needed.
4. Verify the definer function owner, schema CREATE privileges, role inheritance and effective table/function privileges. Service-role RLS bypass and direct trusted-server grants make backend ownership/role checks essential. Audit/event append-only behavior is not protection from the database owner or privileged operators.
5. Inspect existing Auth consumers, hooks/triggers, verification, callbacks, SMTP and external side effects. Token-hash templates needed by the Figma hash router must not silently break another application. Customer Auth must not replace staff scrypt/TOTP sessions or grant staff roles.
6. Confirm runtime service-key bearer compatibility, public API schema exposure and PostgREST function discovery. Local fixture tests do not establish real provider compatibility.

Quotation statuses remain `received`, `in-review`, `responded`, `closed`. No frontend, administrator authentication, ownership or CSRF code changes are proposed.

## Read-only inspection still needed

Attach callable Supabase tools scoped to project inventory and read-only database/catalog, Storage, Auth/settings and backup metadata. The missing capability is the connection in this execution session, not a proven denial of your Owner permissions. Do not paste a service-role key, database password or access token into chat.

If the connector cannot expose those capabilities, a trusted operator may use the dashboard and a read-only database session to collect sanitized metadata. After confirming project reference/organization/purpose, review `supabase/inspection/readiness.sql` and execute only its read-only inspection. The SQL requires catalog/Storage visibility; a failed query means that area remains unverified, not empty. If a transaction aborts, end it with ROLLBACK; do not grant write or service-role privileges to make inspection work.

Record privately:

- Actual project name/ref, organization, authoritative staging designation, separation from production, account scope and active integrations.
- PostgreSQL version, exposed schemas, matching tables/views/columns/constraints/indexes/triggers, role memberships, ACLs/default ACLs/effective column/function privileges, function owners and dependencies. Review relevant function bodies securely; do not publish embedded secrets.
- Migration table presence, exact recorded versions/names and statement content/effects compared with the three repository files. Do not use migration repair or mark migrations applied. Catalog dependencies do not identify every external or dynamic-SQL caller.
- Exact sanitized counts for known business tables where needed, not customer rows. `n_live_tup` in the helper is only a potentially stale estimate. Identify any existing SQLite/CMS/document source separately.
- Bucket privacy/type/size settings and all matching object policies. Do not list private object names or issue signed download URLs during inspection.
- Auth verification, redirect allowlist, template compatibility, SMTP configuration presence, provider limits, hooks and consumers; no credentials or user identities in the report.
- Backup/PITR availability, retention, latest successful backup and recovery process. Storage bytes need independent backup; restore verification itself is a separately approved write operation.

SQL metadata alone does not verify actual HTTP permission behavior, object signing/expiry, Auth mail delivery or recovery. Those require approved isolated provider tests later.

## Validation and rollback limitations

This preparation does not rerun application tests or apply migrations to a hosted or local database. Existing implementation evidence is in `TESTING_AND_ACCEPTANCE.md`: PGlite uses artificial roles/Auth/Storage tables, provider adapters use controlled HTTP fixtures, browser flows use isolated SQLite/scanner fixtures, and deployed Vercel behavior remains unverified.

Local preparation checks completed without a project connection or SQL execution:

| Check | Result and scope |
| --- | --- |
| Python `tomllib` | PASS: TOML syntax, local identifier, migrations enabled, seeds disabled, no remote/provider override blocks |
| PostgreSQL parser (`pglast` 8.6, installed outside the checkout) | PASS: inspection helper has 20 SELECT statements inside BEGIN READ ONLY / ROLLBACK, no DDL/DML/row-locking statement; all three migration files parse without execution. This does not validate PL/pgSQL bodies, catalog existence, runtime permissions or provider behavior. |
| `git check-ignore` | PASS: sample CLI link/cache/branch and environment paths excluded |
| Whitespace/final-newline checks | PASS: all five proposed files |
| Migration SHA-256 comparison | PASS: all three original migration files unchanged |
| Native CLI/provider acceptance | UNVERIFIED: current CLI initialization in a temporary directory failed because its global configuration directory is on the read-only home filesystem; no project was linked |

Provider configuration acceptance must still be checked on the approved isolated preview. Do not treat TOML syntax validation as a successful native CLI/provider validation.

Each migration is a separate transaction; all three are not an atomic release. There are no down migrations. A failed later file can leave earlier migrations applied. Rolling back application code does not reverse schema/data, remove external emails or restore Storage bytes. Do not reset the base project, delete populated tables/buckets or repair history to mask failures. Plan compatible code rollback or an approved forward fix and tested recovery path.

## Exact approval sequence

1. Review the local preparation diff. Keep integration, automatic branching and production deployment disabled. Publishing a review branch is a separate next action once existing automation is checked.
2. Establish read-only access and complete the live report for the nominated project. Resolve conflicts, ACL/Storage/Auth risks, PostgreSQL compatibility, legacy data and recovery requirements. Confirm base-project and preview responsibilities.
3. Approve the exact repository changes and any necessary forward migrations. Confirm a safe push/PR workflow; only then publish a review branch. No merge is implied.
4. Explicitly approve creation of one isolated Supabase preview and execution of its migrations/configuration. Use repository `caitkaterina/Blies`, working directory `.`, production deployment OFF and Supabase-changes-only ON. Do not bind the two Vercel projects to production credentials.
5. Check migration logs/history, effective RLS/grants/Storage/Auth and transaction behavior. Approve isolated functional/provider tests separately; no real customers or production email recipients.
6. Review results before approving any base-staging migration or staging website/backend deployment. Production enablement/merge/publication is a later, independent approval.

## Official sources

Retrieved from Supabase's official documentation repository during preparation (the rendered docs site was unavailable from this environment):

- [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration), [source](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/deployment/branching/github-integration.mdx).
- [Branch configuration](https://supabase.com/docs/guides/deployment/branching/configuration), [source](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/deployment/branching/configuration.mdx).

These describe expected provider behavior; they are not evidence that this account's integration is configured or has been tested.
