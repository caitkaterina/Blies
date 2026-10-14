import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const doc = "33333333-3333-4333-8333-333333333333";
const shipment = "44444444-4444-4444-8444-444444444444";
const fixture = {
  email: "owner@example.test",
  name: "Owner",
  consent: true,
  message: "Help",
};
test("customer PostgreSQL ownership denies guest claiming, foreign records/documents, writes and staff RPCs", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
      CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const migration of [
      "202610130001_backend.sql",
      "202610140001_customers_shipments.sql",
    ])
      await db.exec(
        readFileSync(
          new URL(`../supabase/migrations/${migration}`, import.meta.url),
          "utf8",
        ),
      );
    await db.query("INSERT INTO auth.users VALUES($1,$2),($3,$4)", [
      owner,
      fixture.email,
      other,
      "other@example.test",
    ]);
    await db.exec("SET ROLE service_role");
    for (const [id, customer, documents] of [
      [
        "own",
        owner,
        [{ id: doc, name: "spec.pdf", type: "application/pdf", file: doc }],
      ],
      ["other", other, []],
      ["guest-same-email", null, []],
    ] as const)
      await db.query("SELECT blies_create_enquiry($1,$2,$3,$4,$5,$6)", [
        id,
        "contact",
        "logistics",
        JSON.stringify(fixture),
        JSON.stringify(documents),
        customer,
      ]);
    // The omitted owner parameter stays compatible with guest-only older deployments.
    await db.query("SELECT blies_create_enquiry($1,$2,$3,$4,$5)", [
      "legacy-guest",
      "contact",
      "logistics",
      JSON.stringify(fixture),
      "[]",
    ]);
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    assert.deepEqual(
      (
        await db.query<{ id: string }>(
          "SELECT id,kind,data FROM public.enquiries",
        )
      ).rows.map((row) => row.id),
      ["own"],
    );
    assert.deepEqual(
      (
        await db.query<{ id: string }>(
          "SELECT id FROM public.customer_requests",
        )
      ).rows.map((row) => row.id),
      ["own"],
    );
    assert.deepEqual(
      (
        await db.query<{ id: string }>(
          "SELECT id,name,type FROM public.documents",
        )
      ).rows.map((row) => row.id),
      [doc],
    );
    await assert.rejects(db.exec("SELECT file FROM public.documents"));
    await assert.rejects(
      db.exec("SELECT assigned,reply FROM public.enquiries"),
    );
    await assert.rejects(
      db.query(
        "UPDATE public.enquiries SET customer_id=$1 WHERE id='guest-same-email'",
        [owner],
      ),
    );
    await assert.rejects(
      db.query("SELECT blies_create_enquiry($1,$2,$3,$4,$5,$6)", [
        "forged",
        "contact",
        "logistics",
        JSON.stringify(fixture),
        "[]",
        owner,
      ]),
    );
    await assert.rejects(
      db.query("SELECT blies_create_shipment($1,$2,$3,$4,$5,$6,$7)", [
        "forged",
        shipment,
        "TRACK-1",
        owner,
        "Delivered",
        "",
        "",
      ]),
    );
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ]);
    assert.deepEqual(
      (
        await db.query<{ id: string }>(
          "SELECT id FROM public.customer_requests",
        )
      ).rows.map((row) => row.id),
      ["other"],
    );
    assert.equal(
      (await db.query("SELECT id FROM public.documents")).rows.length,
      0,
    );
    await db.exec("RESET ROLE; SET ROLE anon");
    await assert.rejects(db.exec("SELECT id FROM public.enquiries"));
    await assert.rejects(db.exec("SELECT id FROM public.documents"));
  } finally {
    await db.close();
  }
});

test("shipment updates persist genuine history and immutable audit atomically with owner-only RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
      CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const migration of [
      "202610130001_backend.sql",
      "202610140001_customers_shipments.sql",
    ])
      await db.exec(
        readFileSync(
          new URL(`../supabase/migrations/${migration}`, import.meta.url),
          "utf8",
        ),
      );
    await db.query("INSERT INTO auth.users VALUES($1,$2),($3,$4)", [
      owner,
      fixture.email,
      other,
      "other@example.test",
    ]);
    await db.exec("SET ROLE service_role");
    await db.query("SELECT blies_create_shipment($1,$2,$3,$4,$5,$6,$7)", [
      "staff@example.test",
      shipment,
      "TRACK-1",
      owner,
      "Booked with carrier",
      "Johannesburg",
      "Confirmed collection",
    ]);
    await db.query("SELECT blies_update_shipment($1,$2,$3,$4,$5)", [
      "staff@example.test",
      shipment,
      "Awaiting customs clearance",
      "Durban",
      "Customs documents accepted",
    ]);
    await assert.rejects(
      db.query("SELECT blies_update_shipment($1,$2,$3,$4,$5)", [
        "staff@example.test",
        other,
        "Missing",
        "",
        "",
      ]),
      (error) =>
        !!error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P0002",
    );
    // An invalid event must also roll back the status update and audit event.
    await assert.rejects(
      db.query("SELECT blies_update_shipment($1,$2,$3,$4,$5)", [
        "staff@example.test",
        shipment,
        "Forged",
        "",
        "x".repeat(2001),
      ]),
    );
    assert.equal(
      (await db.query<{ status: string }>("SELECT status FROM shipments"))
        .rows[0].status,
      "Awaiting customs clearance",
    );
    assert.equal(
      (await db.query("SELECT * FROM shipment_events")).rows.length,
      2,
    );
    assert.equal(
      (await db.query("SELECT * FROM audit_records")).rows.length,
      2,
    );
    await assert.rejects(db.exec("UPDATE shipment_events SET status='forged'"));
    await assert.rejects(db.exec("DELETE FROM shipment_events"));
    await assert.rejects(
      db.query("SELECT blies_create_shipment($1,$2,$3,$4,$5,$6,$7)", [
        "staff@example.test",
        doc,
        "TRACK-1",
        owner,
        "duplicate",
        "",
        "",
      ]),
    );
    await assert.rejects(
      db.query("SELECT blies_create_shipment($1,$2,$3,$4,$5,$6,$7)", [
        "staff@example.test",
        doc,
        "UNKNOWN-OWNER",
        "55555555-5555-4555-8555-555555555555",
        "status",
        "",
        "",
      ]),
    );
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    assert.equal((await db.query("SELECT * FROM shipments")).rows.length, 1);
    assert.equal(
      (await db.query("SELECT * FROM shipment_events")).rows.length,
      2,
    );
    await assert.rejects(db.exec("UPDATE shipments SET status='forged'"));
    await assert.rejects(
      db.query("SELECT blies_update_shipment($1,$2,$3,$4,$5)", [
        "forged",
        shipment,
        "forged",
        "",
        "",
      ]),
    );
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ]);
    assert.equal((await db.query("SELECT * FROM shipments")).rows.length, 0);
    assert.equal(
      (await db.query("SELECT * FROM shipment_events")).rows.length,
      0,
    );
    await db.exec(
      "RESET ROLE; GRANT SELECT ON public.shipments,public.shipment_events TO anon; SET ROLE anon",
    );
    assert.equal((await db.query("SELECT * FROM shipments")).rows.length, 0);
    assert.equal(
      (await db.query("SELECT * FROM shipment_events")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
