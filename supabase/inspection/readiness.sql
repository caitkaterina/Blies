-- PROPOSED READ-ONLY INSPECTION; not executed against a hosted project.
-- First independently confirm project ref, organization and staging purpose.
-- Use a trusted operator/read-only connection. Keep results private: policy
-- expressions and ACL metadata can reveal internal configuration.
-- This file is outside migrations/ and must never be treated as a migration.
BEGIN READ ONLY;

SELECT current_database(), current_user, current_setting('server_version') AS postgres_version;

SELECT n.nspname AS schema, c.relname AS object, c.relkind,
       pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity, c.relforcerowsecurity,
       c.reloptions, c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'auth', 'storage', 'supabase_migrations')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
ORDER BY n.nspname, c.relname;

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema IN ('public', 'storage', 'supabase_migrations')
ORDER BY table_schema, table_name, ordinal_position;

SELECT n.nspname AS schema, c.relname AS object, con.conname,
       pg_get_constraintdef(con.oid) AS definition, con.convalidated
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, c.relname, con.conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, indexname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

SELECT rolname, rolcanlogin, rolsuper, rolinherit, rolbypassrls
FROM pg_roles ORDER BY rolname;

SELECT parent.rolname AS granted_role, member.rolname AS member, m.admin_option
FROM pg_auth_members m JOIN pg_roles parent ON parent.oid = m.roleid
JOIN pg_roles member ON member.oid = m.member
ORDER BY parent.rolname, member.rolname;

SELECT pg_get_userbyid(d.defaclrole) AS owner, n.nspname AS schema,
       d.defaclobjtype, d.defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace;

SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema IN ('public', 'storage')
ORDER BY table_schema, table_name, grantee, privilege_type;

SELECT grantee, table_schema, table_name, column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema IN ('public', 'storage')
ORDER BY table_schema, table_name, column_name, grantee, privilege_type;

-- Effective table and column privileges include inherited/PUBLIC grants.
-- Only roles that actually exist are tested.
SELECT r.rolname, n.nspname AS schema, c.relname AS object,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS can_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete
FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
  AND n.nspname IN ('public', 'storage') AND c.relkind IN ('r', 'p', 'v')
ORDER BY r.rolname, n.nspname, c.relname;

SELECT r.rolname, c.relname AS object, a.attname AS column,
       has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') AS can_select
FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
  AND n.nspname = 'public' AND c.relname IN ('enquiries', 'documents')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY r.rolname, c.relname, a.attnum;

SELECT n.nspname AS schema, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'storage')
ORDER BY n.nspname, p.proname, arguments;

SELECT pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object,
       pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid) AS referenced_object,
       d.deptype
FROM pg_depend d JOIN pg_proc p ON d.refclassid = 'pg_proc'::regclass AND d.refobjid = p.oid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('blies_create_enquiry', 'blies_update_record')
ORDER BY referenced_object, dependent_object;
-- Catalog dependencies do not capture every dynamic SQL or external API caller.

SELECT r.rolname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_roles r CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
  AND n.nspname = 'public' AND p.proname LIKE 'blies_%'
ORDER BY r.rolname, p.proname, arguments;

SELECT n.nspname AS schema, c.relname AS object, t.tgname,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage', 'auth') AND NOT t.tgisinternal
ORDER BY n.nspname, c.relname, t.tgname;

-- Estimates only, not exact counts or proof that a table is empty.
SELECT schemaname, relname, n_live_tup AS estimated_rows
FROM pg_stat_user_tables WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, relname;

SELECT to_regclass('supabase_migrations.schema_migrations') AS migration_history_table;
-- If that table exists, inspect its version/name/statement column metadata first,
-- then read versions/names privately and compare recorded SQL to the repo.
-- Do not repair migration history or mark a version applied during inspection.

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets ORDER BY id;

ROLLBACK;
