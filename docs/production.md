# Production connections and release gates

## Hosting and data

Use Node.js 24 on a persistent single-instance Node host for the supplied SQLite/private-files adapter. The database and documents live **outside the checkout and public directory**, default `/workspace/blies-private`; files are 0600 and directories 0700. The database is not encrypted by this application. Production must supply encrypted persistent volumes, HTTPS, access-controlled backups and a tested restore process. Do not deploy this adapter on ephemeral/serverless storage or multiple replicas. A managed database/object-storage adapter must replace it for those topologies.

At the edge configure HTTPS, HSTS, WAF rules, upload body limits no larger than 32 MB, independent IP-based abuse controls, request timeouts and monitoring. The application includes global + email-hash rate limits; per-IP limiting requires a trusted gateway. Never enable `BLIES_TRUST_PROXY` unless clients cannot forge `X-Real-IP`. HSTS is returned for HTTPS requests. Confirm it at the actual hosting edge.

No public document URLs are generated. Downloads require an authorised session and are sent as attachments with `no-store`. Storage and scan failures never show submission success. The scanner is a prerequisite to all document uploads, not an optional check. A maximum of three files, 10 MB each, is enforced; only signature-checked PDF, JPEG and PNG are accepted. RFQs, BOQs and drawings should be exported to those formats.

## Email

Configure a verified sender in `BLIES_EMAIL_FROM` and a Resend API credential in `BLIES_EMAIL_API_KEY`; allow `api.resend.com`. HTTPS proxy bindings are supported for this key at that destination. English, French and Arabic confirmations include the unique reference and qualified quote-turnaround text. A received local record is real even if email is pending, and the confirmation explicitly states that delivery is not configured or not yet successful. Admin records show email state and allow retry. Do not interpret a pending state as delivery.

Responses have private internal drafts and an explicit staff-only Send response by email action using the configured provider. Responses are marked sent only when the provider accepts them; missing configuration and delivery failures return errors. Idempotency keys prevent provider-level duplicate sends on retries. Deep CRM/ERP integration remains future scope. SQLite is the initial internal CRM record adapter, with timestamps, queues, status, references, assignments and private documents.

## Malware scanning

Set `BLIES_SCAN_URL` to an approved HTTPS endpoint and `BLIES_SCAN_KEY` as a protected credential scoped to that exact hostname. The endpoint receives document bytes in a POST with the file MIME type and Bearer authentication; it must scan the actual bytes with a supported, up-to-date malware engine and return JSON `{ "clean": true }` **only after a successful clean scan**. Every other verdict, malformed response, timeout or unavailable scanner fails closed. Scanner hostname, retention and privacy arrangements must be approved before connecting. Do not connect the test fixture to a deployment.

## Administrator access

There are no default production credentials. Store the following as protected **local runtime secrets** (proxy placeholders cannot be used for local password checks/signing):

- `BLIES_ADMIN_EMAIL`: initial authorised administrator identity.
- `BLIES_ADMIN_PASSWORD_HASH`: `scrypt:<random-salt>:<128-character-hex-hash>`; derive with Node `scryptSync(password, salt, 64)`. Use a strong unique password and generate the hash locally without logging it.
- `BLIES_ADMIN_TOTP_SECRET`: a randomly generated Base32 authenticator secret, minimum 80 bits; enrol it securely in an authenticator.
- `BLIES_SESSION_SECRET`: at least 32 random characters; rotate it to revoke all sessions.
- Optional `BLIES_STAFF_ACCOUNTS_JSON`: protected array of `{email,role,passwordHash,totpSecret}` accounts. Supported roles are `admin`, `editor`, `sales`. Editors manage content/history; sales manage enquiries/documents; administrators access both. Removing an identity or changing its role invalidates its existing session.

Sessions expire after one hour, use HttpOnly/SameSite=Strict cookies and Secure in production. Mutations require same-origin checks plus session CSRF tokens. TOTP codes cannot be replayed during their accepted window. Failed access, sign-in, edits, record changes and document downloads have audit events. Production identity management, password reset and automated provisioning should use an approved enterprise identity provider.

## Content management

At `/admin`, create or edit a content entry; supply all three languages, draft/publish/archive status and display order. Services and industries can start from the source pages and override their public routes after publication. New verified service routes also resolve dynamically. Fleet entries require both verified content and confirmed ownership; planned assets cannot be published. Add approved specifications as translated body paragraphs and authentic photos/video as HTTPS media URLs. Individual entries and categories can use distinct nested slugs (for example, `fleet/approved-category/approved-vehicle`). No initial categories are invented.

Location entries accept classifications and schematic map x/y coordinates (0–100), with translated titles/descriptions; existing marker IDs (`za`, `ga`, etc.) can be overridden. Locations without coordinates remain unpublished on the schematic. Settings entries hold corporate contacts; publish only approved values. Fleet photography, category and asset records have explicit ownership and planning flags; no numerical aggregate is computed.

The CMS retains previous content versions and audit history. It does not replace the need for editorial sign-off. Article authors, dates, titles, body, media and metadata should be verified before publishing. The base editorial hub is original general guidance, not client stories or legal advice.

## Languages, legal, analytics and SEO

English/French/Arabic URLs, RTL and multilingual forms are implemented. Professional reviewers must approve all translated copy, emails, legal wording and company claims. There is no public PDF-generation feature; translated quotation PDFs require a future approved template/export integration.

Legal documents are deliberately marked review drafts. Qualified advisers must approve POPIA and applicable GDPR, UAE and Gabon obligations, retention/deletion schedules, data-subject procedures, quote terms and cross-border processor agreements. Do not assert compliance until that review is complete.

Optional Plausible analytics needs `BLIES_ANALYTICS_DOMAIN` and access to `plausible.io`; it loads only following opt-in for the current visit. No tracking analytics are enabled by default.

Set `BLIES_SITE_URL` to the approved HTTPS public origin. Indexing is blocked until `BLIES_LAUNCH_APPROVED=true`; that flag is a release control, not evidence of completion. Confirm canonical URLs, language URLs and `hreflang` on the deployed domain, and approve per-language keywords. Verify CDN compression/cache behaviour and run field Core Web Vitals monitoring on the actual production deployment.

## Launch checklist

Resolve the supplied master brief’s management confirmations: registration/VAT, B-BBEE, licences/insurance/certifications, leadership, Gabon/UAE details, fleet reconciliation/photos/specifications, tracking coverage, quote target approval, QC standards, temperature/pharmaceutical standards, dangerous goods, corridors, clearing arrangements, partner permissions and brand assets. Replace development contacts. Confirm the WhatsApp Business number.

Connect real email and scanning; provision secure staff accounts and encrypted durable storage; review backup restoration and retention. Obtain professional translation and legal approval. Perform independent penetration testing, manual keyboard/screen-reader/RTL testing, device testing and deployed performance checks. Automated checks alone do not certify WCAG 2.2 AA or production security.

My BLIES, client live tracking, Document Vault, mode recommendations, real-time timelines, deeper CRM/ERP and expansion assets remain **future development**. Reserved URLs are informational and never show an operational login or invented status. Secure portal architecture will require MFA, RBAC, audit logs and expiring/revocable document access when developed.
