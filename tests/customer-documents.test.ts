import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    if (specifier.startsWith(".") && !/\.[^/]+$/.test(specifier))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

test("customer document JSON/redirect responses require verified ownership before signing and audit", async () => {
  const names = [
    "BLIES_STORAGE_MODE",
    "BLIES_SUPABASE_URL",
    "BLIES_SUPABASE_ANON_KEY",
    "BLIES_SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const previous = names.map((name) => [name, process.env[name]] as const),
    oldFetch = globalThis.fetch;
  Object.assign(process.env, {
    BLIES_STORAGE_MODE: "supabase",
    BLIES_SUPABASE_URL: "https://test.supabase.co",
    BLIES_SUPABASE_ANON_KEY: "test-public-key",
    BLIES_SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
  });
  const owner = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222",
    id = "33333333-3333-4333-8333-333333333333";
  const { GET } = await import("../app/api/customer/documents/[id]/route.ts");
  let signed = 0,
    audited = 0;
  const request = (token?: string, format = "json") =>
    new Request(
      `https://backend.example/api/customer/documents/${id}${format ? `?format=${format}` : ""}`,
      { headers: token ? { cookie: `blies_customer_access=${token}` } : {} },
    );
  const context = { params: Promise.resolve({ id }) };
  try {
    globalThis.fetch = async (url, init) => {
      const endpoint = new URL(String(url));
      if (endpoint.pathname === "/auth/v1/user") {
        const auth = new Headers(init?.headers).get("Authorization");
        return Response.json({
          id: auth === "Bearer owner.token" ? owner : other,
          email: "customer@example.test",
          email_confirmed_at: "2026-10-14T00:00:00Z",
          user_metadata: { name: "Customer" },
        });
      }
      if (endpoint.pathname === "/rest/v1/documents") {
        assert.equal(endpoint.searchParams.get("id"), `eq.${id}`);
        assert.match(
          endpoint.searchParams.get("select") || "",
          /enquiries!inner\(customer_id\)/,
        );
        return Response.json(
          endpoint.searchParams.get("enquiries.customer_id") === `eq.${owner}`
            ? [{ id, name: "spec.pdf", type: "application/pdf", file: id }]
            : [],
        );
      }
      if (endpoint.pathname === `/storage/v1/object/sign/blies-private/${id}`) {
        signed++;
        assert.deepEqual(JSON.parse(String(init?.body)), {
          expiresIn: 60,
          download: true,
        });
        return Response.json({
          signedURL: `/object/sign/blies-private/${id}?token=test-signed-token`,
        });
      }
      assert.equal(endpoint.pathname, "/rest/v1/rpc/blies_audit");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        p_actor: owner,
        p_event: "customer.document.download",
        p_target: id,
      });
      audited++;
      return Response.json(null);
    };
    assert.equal((await GET(request(), context)).status, 401);
    assert.equal((await GET(request("other.token"), context)).status, 404);
    assert.equal(signed, 0);
    assert.equal(audited, 0);
    const response = await GET(request("owner.token"), context);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    assert.deepEqual(await response.json(), {
      url: `https://test.supabase.co/storage/v1/object/sign/blies-private/${id}?token=test-signed-token`,
    });
    const redirect = await GET(request("owner.token", ""), context);
    assert.equal(redirect.status, 302);
    assert.match(
      redirect.headers.get("location") || "",
      /\/storage\/v1\/object\/sign\//,
    );
    assert.equal(signed, 2);
    assert.equal(audited, 2);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
