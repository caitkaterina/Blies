import { test, after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Establish the isolated directory before any store module captures its configuration.
const directory = mkdtempSync(path.join(tmpdir(), "blies-customer-store-"));
const originalDataDir = process.env.BLIES_DATA_DIR;
process.env.BLIES_DATA_DIR = directory;
after(() => {
  if (originalDataDir === undefined) delete process.env.BLIES_DATA_DIR;
  else process.env.BLIES_DATA_DIR = originalDataDir;
  rmSync(directory, { recursive: true, force: true });
});
function preserveEnvironment() {
  const names = [
    "BLIES_STORAGE_MODE",
    "BLIES_SUPABASE_URL",
    "BLIES_SUPABASE_SERVICE_ROLE_KEY",
    "VERCEL",
    "VERCEL_ENV",
  ] as const;
  const previous = names.map((name) => [name, process.env[name]] as const);
  return () => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

// Next's server-only marker is a bundler guard, not an authentication mock. Resolve
// it to an empty module only in this isolated Node test process; use real SQLite.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith(".") && !/\.[^/]+$/.test(specifier))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

test("SQLite customer adapter isolates owners, hides staff/file metadata, and audits genuine shipment writes", async () => {
  const restoreEnvironment = preserveEnvironment();
  process.env.BLIES_STORAGE_MODE = "sqlite";
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  const store = await import("../lib/customer-store.ts");
  const { db } = await import("../lib/store.ts");
  const connection = db();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const document = "33333333-3333-4333-8333-333333333333";
  const shipment = "44444444-4444-4444-8444-444444444444";
  try {
    const fixture = {
      name: "Owner",
      email: "same@example.test",
      message: "Help",
      internal: "must not leak",
      website: "",
    };
    for (const [id, customer] of [
      ["own", owner],
      ["other", other],
      ["guest-same-email", null],
    ])
      connection
        .prepare(
          "INSERT INTO enquiries(id,kind,created,status,queue,email_status,data,assigned,reply,customer_id) VALUES(?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          "contact",
          new Date().toISOString(),
          "received",
          "logistics",
          "pending",
          JSON.stringify(fixture),
          "staff@example.test",
          "private staff note",
          customer,
        );
    connection
      .prepare("INSERT INTO documents VALUES(?,?,?,?,?)")
      .run(document, "own", "spec.pdf", "application/pdf", document);
    const records = await store.customerRecords(owner);
    assert.equal(records.length, 1);
    assert.equal(records[0].id, "own");
    assert.equal("assigned" in records[0], false);
    assert.equal("reply" in records[0], false);
    assert.equal("internal" in records[0].data, false);
    assert.equal("website" in records[0].data, false);
    assert.deepEqual(records[0].documents, [
      { id: document, name: "spec.pdf", type: "application/pdf" },
    ]);
    assert.equal(await store.canAccessDocument(other, document), undefined);
    assert.equal(
      (await store.canAccessDocument(owner, document))?.file,
      document,
    );
    assert.equal(await store.canAccessDocument(owner, "' OR 1=1"), undefined);
    const value = {
      id: shipment,
      customerId: owner,
      reference: "REAL-TRACKING-1",
      status: "Booked",
      location: "Johannesburg",
      description: "Carrier confirmed",
    };
    await store.createShipment("staff@example.test", value);
    await store.updateShipment("staff@example.test", {
      id: shipment,
      status: "At depot",
      location: "Durban",
      description: "Arrived at depot",
    });
    const owned = await store.customerShipments(owner, value.reference);
    assert.equal(owned.length, 1);
    assert.equal(owned[0].status, "At depot");
    assert.equal(owned[0].events.length, 2);
    assert.equal("customerId" in owned[0], false);
    assert.equal(
      (await store.customerShipments(other, value.reference)).length,
      0,
    );
    assert.equal((await store.customerShipments(owner, "unknown")).length, 0);
    assert.equal((await store.shipments())[0].customerId, owner);
    await assert.rejects(
      store.createShipment("staff@example.test", { ...value, id: document }),
      (error) =>
        error instanceof store.ShipmentInputError && error.status === 409,
    );
    await assert.rejects(
      store.updateShipment("staff@example.test", {
        id: other,
        status: "Missing",
        location: "",
        description: "",
      }),
      (error) =>
        error instanceof store.ShipmentInputError && error.status === 404,
    );
    await assert.rejects(
      store.updateShipment("staff@example.test", {
        id: shipment,
        status: "",
        location: "",
        description: "",
      }),
      store.ShipmentInputError,
    );
    assert.equal(
      connection.prepare("SELECT count(*) AS total FROM audit").get()?.total,
      2,
    );
  } finally {
    connection.close();
    restoreEnvironment();
  }
});

test("Supabase shipment errors map only approved SQLSTATEs without exposing database details", async () => {
  const restoreEnvironment = preserveEnvironment(),
    oldFetch = globalThis.fetch;
  process.env.BLIES_STORAGE_MODE = "supabase";
  process.env.BLIES_SUPABASE_URL = "https://test.supabase.co";
  process.env.BLIES_SUPABASE_SERVICE_ROLE_KEY = "test-only-private-key";
  const store = await import("../lib/customer-store.ts");
  const { StorageUnavailable } = await import("../lib/storage-policy.ts");
  const value = {
    id: "44444444-4444-4444-8444-444444444444",
    customerId: "11111111-1111-4111-8111-111111111111",
    reference: "TRACK-1",
    status: "Booked",
    location: "",
    description: "",
  };
  try {
    for (const [code, status, message, method] of [
      ["23505", 409, "Reference already exists", "create"],
      ["23503", 400, "Customer account not found", "create"],
      ["P0002", 404, "Shipment not found", "update"],
    ] as const) {
      globalThis.fetch = async (url, init) => {
        assert.equal(
          String(url),
          `https://test.supabase.co/rest/v1/rpc/blies_${method}_shipment`,
        );
        assert.equal(init?.method, "POST");
        assert.equal(
          new Headers(init?.headers).get("Authorization"),
          "Bearer test-only-private-key",
        );
        assert.equal(
          JSON.parse(String(init?.body)).p_actor,
          "staff@example.test",
        );
        return Response.json(
          {
            code,
            message: "private schema details",
            details: "sensitive row value",
            hint: "private hint",
          },
          { status: code === "P0002" ? 404 : 409 },
        );
      };
      const operation =
        method === "create" ? store.createShipment : store.updateShipment;
      await assert.rejects(
        operation("staff@example.test", value),
        (error) =>
          error instanceof store.ShipmentInputError &&
          error.status === status &&
          error.message === message &&
          !("details" in error),
      );
    }
    for (const response of [
      Response.json(
        { code: "42501", message: "private grants" },
        { status: 403 },
      ),
      Response.json(
        { code: "23514", message: "private constraint" },
        { status: 400 },
      ),
      new Response("upstream unavailable", { status: 503 }),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(
        store.createShipment("staff@example.test", value),
        (error) =>
          error instanceof StorageUnavailable &&
          !(error instanceof store.ShipmentInputError) &&
          error.message === "Persistent backend unavailable",
      );
    }
  } finally {
    restoreEnvironment();
    globalThis.fetch = oldFetch;
  }
});
