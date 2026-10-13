import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL migration: atomic writes, constraints, browser denial, private bucket and durable limits", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610130001_backend.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("SET ROLE service_role");
    const data = {
      email: "test@example.com",
      consent: true,
      name: "Test",
      message: "Help",
      locale: "en",
    };
    await db.query("SELECT public.blies_create_enquiry($1,$2,$3,$4,$5)", [
      "contact-1",
      "contact",
      "logistics",
      JSON.stringify(data),
      "[]",
    ]);
    assert.equal(
      (await db.query("SELECT * FROM contact_enquiries")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("SELECT public.blies_create_enquiry($1,$2,$3,$4,$5)", [
        "bad",
        "quote",
        "logistics",
        JSON.stringify(data),
        JSON.stringify([{ id: "not-a-uuid" }]),
      ]),
    );
    assert.equal(
      (await db.query("SELECT * FROM enquiries WHERE id='bad'")).rows.length,
      0,
    );
    await db.query("SELECT blies_update_record($1,$2,$3,$4,$5)", [
      "admin@example.com",
      "contact-1",
      "in-review",
      "",
      "",
    ]);
    await assert.rejects(
      db.query("SELECT blies_update_record($1,$2,$3,$4,$5)", [
        "admin@example.com",
        "contact-1",
        "invented",
        "",
        "",
      ]),
    );
    assert.equal(
      (await db.query("SELECT * FROM audit_records")).rows.length,
      2,
    );
    for (const allowed of [true, true, false])
      assert.equal(
        (
          await db.query<{ ok: boolean }>(
            "SELECT blies_rate_limit($1,2,60) AS ok",
            ["test"],
          )
        ).rows[0].ok,
        allowed,
      );
    await assert.rejects(db.exec("DELETE FROM audit_records"));
    await assert.rejects(db.exec("UPDATE audit_records SET actor='forged'"));
    const docId = "11111111-1111-4111-8111-111111111111";
    const quote = {
      ...data,
      service: "road",
      originCountry: "South Africa",
      destinationCountry: "Gabon",
      cargo: "Equipment",
      quantity: 2,
      requirements: "Handle carefully",
    };
    await db.query("SELECT blies_create_enquiry($1,$2,$3,$4,$5)", [
      "quote-1",
      "quote",
      "logistics",
      JSON.stringify(quote),
      JSON.stringify([
        { id: docId, file: docId, name: "spec.pdf", type: "application/pdf" },
      ]),
    ]);
    assert.deepEqual(
      (
        await db.query<{ data: unknown }>(
          "SELECT data FROM quotation_requests WHERE id='quote-1'",
        )
      ).rows[0].data,
      quote,
    );
    assert.equal(
      (await db.query("SELECT * FROM documents WHERE enquiry='quote-1'")).rows
        .length,
      1,
    );
    const content = {
      verified: true,
      title: { en: "Test", fr: "Test", ar: "Test" },
    };
    for (const title of ["First", "Second"])
      await db.query("SELECT blies_save_content($1,$2,$3,$4,$5,$6,$7)", [
        "editor@example.test",
        "content-1",
        "service",
        "test-service",
        "published",
        1,
        JSON.stringify({
          ...content,
          title: { en: title, fr: title, ar: title },
        }),
      ]);
    assert.equal(
      (await db.query("SELECT * FROM versions WHERE content_id='content-1'"))
        .rows.length,
      1,
    );
    await db.exec("RESET ROLE");
    const bucket = (
      await db.query<{ public: boolean }>("SELECT * FROM storage.buckets")
    ).rows[0];
    assert.equal(bucket.public, false);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of [
        "enquiries",
        "contact_enquiries",
        "quotation_requests",
        "documents",
        "audit_records",
        "limits",
        "content",
        "versions",
      ])
        await assert.rejects(db.exec(`SELECT * FROM public.${table}`));
      await assert.rejects(
        db.query("SELECT blies_update_record($1,$2,$3,$4,$5)", [
          "forged",
          "contact-1",
          "closed",
          "",
          "",
        ]),
      );
      await assert.rejects(
        db.query("SELECT blies_create_enquiry($1,$2,$3,$4,$5)", [
          "anonymous",
          "contact",
          "logistics",
          JSON.stringify(data),
          "[]",
        ]),
      );
      await db.exec("RESET ROLE");
    }
    // Even if future default grants accidentally expose SELECT, RLS still denies browser rows.
    await db.exec("GRANT SELECT ON public.enquiries TO anon; SET ROLE anon");
    assert.equal(
      (await db.query("SELECT * FROM public.enquiries")).rows.length,
      0,
    );
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});
