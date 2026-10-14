import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { brandedEmail } from "../lib/email-template.ts";
const owner = "11111111-1111-4111-8111-111111111111",
  token = "22222222-2222-4222-8222-222222222222",
  shipment = "33333333-3333-4333-8333-333333333333";
test("all migrations preserve idempotent submissions, durable outbox, private grants and shipment notifications", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO authenticated,service_role;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
    );
    for (const file of [
      "202610130001_backend.sql",
      "202610140001_customers_shipments.sql",
      "202610140002_delivery.sql",
    ])
      await db.exec(
        readFileSync(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    await db.query("INSERT INTO auth.users VALUES($1,$2)", [
      owner,
      "owner@example.test",
    ]);
    await db.exec("SET ROLE service_role");
    const claim = async (hash = "hash") =>
      (
        await db.query<{ result: { state: string } }>(
          "SELECT blies_claim_submission($1,$2,$3,$4) AS result",
          ["key", hash, token, "request-1"],
        )
      ).rows[0].result;
    assert.equal((await claim()).state, "claimed");
    assert.equal((await claim()).state, "busy");
    assert.equal((await claim("different")).state, "conflict");
    await db.query(
      "SELECT blies_submit_enquiry($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        "key",
        token,
        "request-1",
        "contact",
        "logistics",
        JSON.stringify({
          locale: "en",
          name: "Owner",
          email: "owner@example.test",
          consent: true,
          message: "Help",
        }),
        "[]",
        owner,
        "staff@example.test",
        true,
      ],
    );
    assert.equal((await claim()).state, "complete");
    assert.equal((await db.query("SELECT * FROM enquiries")).rows.length, 1);
    assert.equal((await db.query("SELECT * FROM email_outbox")).rows.length, 2);
    await db.query("SELECT blies_update_record($1,$2,$3,$4,$5,$6)", [
      "admin",
      "request-1",
      "in-review",
      "",
      "Draft",
      false,
    ]);
    assert.equal((await db.query("SELECT * FROM email_outbox")).rows.length, 3);
    await db.query("SELECT blies_create_shipment($1,$2,$3,$4,$5,$6,$7)", [
      "admin",
      shipment,
      "TRACK-REAL",
      owner,
      "Awaiting collection",
      "Johannesburg",
      "Confirmed by staff",
    ]);
    assert.equal(
      (await db.query("SELECT * FROM email_outbox WHERE id LIKE 'shipment:%'"))
        .rows.length,
      1,
    );
    const jobs = await db.query<{
      id: string;
      attempts: number;
      claim_token: string;
    }>("SELECT * FROM blies_claim_emails(10)");
    assert.equal(jobs.rows.length, 4);
    assert.ok(jobs.rows.every((j) => j.attempts === 1));
    assert.equal(
      (await db.query("SELECT * FROM blies_claim_emails(10)")).rows.length,
      0,
    );
    await db.query("SELECT blies_finish_email($1,true,$2)", [
      jobs.rows[0].id,
      owner,
    ]);
    assert.equal(
      (await db.query("SELECT * FROM email_outbox WHERE state='sent'")).rows
        .length,
      0,
    );
    await db.query("SELECT blies_finish_email($1,true,$2)", [
      jobs.rows[0].id,
      jobs.rows[0].claim_token,
    ]);
    assert.equal(
      (await db.query("SELECT * FROM email_outbox WHERE state='sent'")).rows
        .length,
      1,
    );
    await db.exec("RESET ROLE;SET ROLE anon");
    for (const table of ["email_outbox", "submission_keys"])
      await assert.rejects(db.exec("SELECT * FROM " + table));
    await assert.rejects(claim());
  } finally {
    await db.close();
  }
});
test("branded email escapes untrusted customer and staff content", () => {
  const rendered = brandedEmail('<script>alert("bad")</script>', "<customer>");
  assert.ok(!rendered.includes("<script>"));
  assert.ok(rendered.includes("&lt;script&gt;"));
  assert.ok(rendered.includes("BLIES (Pty) Ltd"));
});
