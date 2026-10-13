import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseRequest, rpc } from "../lib/supabase-http.ts";
import { StorageUnavailable } from "../lib/storage-policy.ts";
test("Supabase HTTP contract uses server credential, disables caching, and fails closed", async () => {
  const oldFetch = globalThis.fetch,
    oldUrl = process.env.BLIES_SUPABASE_URL,
    oldKey = process.env.BLIES_SUPABASE_SERVICE_ROLE_KEY;
  process.env.BLIES_SUPABASE_URL = "https://test.supabase.co";
  process.env.BLIES_SUPABASE_SERVICE_ROLE_KEY = "test-only";
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(
        String(url),
        "https://test.supabase.co/rest/v1/rpc/blies_rate_limit",
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer test-only",
      );
      assert.equal(init?.cache, "no-store");
      assert.equal(JSON.parse(String(init?.body)).p_key, "test");
      return Response.json(true);
    };
    assert.equal(await rpc("blies_rate_limit", { p_key: "test" }), true);
    globalThis.fetch = async () =>
      new Response("private error", { status: 401 });
    await assert.rejects(
      supabaseRequest("/rest/v1/enquiries"),
      StorageUnavailable,
    );
    process.env.BLIES_SUPABASE_URL = "http://attacker.example";
    await assert.rejects(
      supabaseRequest("/rest/v1/enquiries"),
      StorageUnavailable,
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.BLIES_SUPABASE_URL;
    else process.env.BLIES_SUPABASE_URL = oldUrl;
    if (oldKey === undefined)
      delete process.env.BLIES_SUPABASE_SERVICE_ROLE_KEY;
    else process.env.BLIES_SUPABASE_SERVICE_ROLE_KEY = oldKey;
  }
});
