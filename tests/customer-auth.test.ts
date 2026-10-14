import { test } from "node:test";
import assert from "node:assert/strict";
import {
  customerIdentity,
  customerMutationAllowed,
  customerAuthAction,
  CustomerAuthError,
} from "../lib/customer-auth.ts";
import { StorageUnavailable } from "../lib/storage-policy.ts";

const id = "11111111-1111-4111-8111-111111111111";
const verified = {
  id,
  email: "owner@example.test",
  email_confirmed_at: "2026-10-14T00:00:00Z",
  user_metadata: { name: "Customer", role: "admin" },
};
const request = (
  cookie = "",
  origin = "https://frontend.example",
  csrf = "1",
) =>
  new Request("https://backend.example/api/customer/auth", {
    method: "POST",
    headers: { cookie, Origin: origin, "X-BLIES-CSRF": csrf },
  });
const limit = async () => true;

test("customer identity verifies a server-held token with GoTrue and ignores browser identity/roles", async () => {
  const oldFetch = globalThis.fetch;
  const old = { ...process.env };
  process.env.BLIES_SUPABASE_URL = "https://test.supabase.co";
  process.env.BLIES_SUPABASE_ANON_KEY = "public-test-only";
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "https://test.supabase.co/auth/v1/user");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer valid.access",
      );
      assert.equal(
        new Headers(init?.headers).get("apikey"),
        "public-test-only",
      );
      assert.equal(init?.cache, "no-store");
      return Response.json(verified);
    };
    assert.deepEqual(
      await customerIdentity(request("blies_customer_access=valid.access")),
      { id, email: verified.email, name: "Customer" },
    );
    assert.equal(await customerIdentity(request()), null);
    globalThis.fetch = async () =>
      Response.json({ ...verified, email_confirmed_at: null });
    assert.equal(
      await customerIdentity(request("blies_customer_access=valid.access")),
      null,
    );
    globalThis.fetch = async () => new Response(null, { status: 401 });
    assert.equal(
      await customerIdentity(request("blies_customer_access=valid.access")),
      null,
    );
    globalThis.fetch = async () => {
      throw Error("provider down");
    };
    await assert.rejects(
      customerIdentity(request("blies_customer_access=valid.access")),
      StorageUnavailable,
    );
    delete process.env.BLIES_SUPABASE_ANON_KEY;
    await assert.rejects(
      customerIdentity(request("blies_customer_access=valid.access")),
      StorageUnavailable,
    );
  } finally {
    globalThis.fetch = oldFetch;
    process.env = old;
  }
});

test("customer mutations require exact approved origin and CSRF header", () => {
  const old = process.env.BLIES_PUBLIC_ORIGINS;
  process.env.BLIES_PUBLIC_ORIGINS = "https://frontend.example";
  try {
    assert.equal(customerMutationAllowed(request()), true);
    for (const req of [
      request("", "https://frontend.example", ""),
      request("", "https://frontend.example.evil"),
      request("", "https://frontend.example/path"),
      request("", "null"),
    ])
      assert.equal(customerMutationAllowed(req), false);
  } finally {
    if (old === undefined) delete process.env.BLIES_PUBLIC_ORIGINS;
    else process.env.BLIES_PUBLIC_ORIGINS = old;
  }
});

test("login/refresh/verification keep tokens in strict HttpOnly cookies and never return them", async () => {
  const oldFetch = globalThis.fetch,
    old = { ...process.env };
  process.env.BLIES_SUPABASE_URL = "https://test.supabase.co";
  process.env.BLIES_SUPABASE_ANON_KEY = "public-test-only";
  process.env.BLIES_PUBLIC_ORIGINS = "https://frontend.example";
  Object.assign(process.env, { NODE_ENV: "production" });
  const tokens = {
    access_token: "valid.access",
    refresh_token: "valid-refresh",
    expires_in: 3600,
  };
  try {
    const seen: string[] = [];
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname + new URL(String(url)).search;
      seen.push(path);
      if (path === "/auth/v1/user") return Response.json(verified);
      if (path.includes("refresh_token"))
        assert.deepEqual(JSON.parse(String(init?.body)), {
          refresh_token: "old-refresh",
        });
      return Response.json(tokens);
    };
    for (const [req, data] of [
      [
        request(),
        { action: "login", email: verified.email, password: "ExistingPass" },
      ],
      [request("blies_customer_refresh=old-refresh"), { action: "refresh" }],
      [
        request(),
        {
          action: "verify",
          token_hash: "valid-hash-1234567890",
          type: "recovery",
        },
      ],
    ] as const) {
      const response = await customerAuthAction(req, data, limit);
      assert.deepEqual(await response.json(), {
        user: { id, email: verified.email, name: "Customer" },
      });
      const cookies = response.headers.getSetCookie();
      assert.equal(cookies.length, 2);
      for (const cookie of cookies) {
        assert.match(cookie, /HttpOnly; SameSite=Strict/);
        assert.match(cookie, /; Secure/);
        assert.match(cookie, /Path=\/api/);
      }
    }
    assert.ok(seen.includes("/auth/v1/token?grant_type=refresh_token"));
    assert.ok(seen.includes("/auth/v1/verify"));
    globalThis.fetch = async () =>
      Response.json({ ...verified, email_confirmed_at: null });
    await assert.rejects(
      customerAuthAction(
        request(),
        { action: "login", email: verified.email, password: "testpass" },
        limit,
      ),
      CustomerAuthError,
    );
  } finally {
    globalThis.fetch = oldFetch;
    process.env = old;
  }
});

test("registration/recovery prevent account enumeration; profile cannot edit roles or account ownership", async () => {
  const oldFetch = globalThis.fetch,
    old = { ...process.env };
  process.env.BLIES_SUPABASE_URL = "https://test.supabase.co";
  process.env.BLIES_SUPABASE_ANON_KEY = "public-test-only";
  process.env.BLIES_PUBLIC_ORIGINS = "https://frontend.example";
  process.env.BLIES_CUSTOMER_SITE_URL = "https://frontend.example";
  try {
    for (const action of ["register", "recover"]) {
      const responses: unknown[] = [];
      for (const status of [200, 400, 422]) {
        globalThis.fetch = async (url) => {
          assert.equal(
            new URL(String(url)).searchParams.get("redirect_to"),
            "https://frontend.example/",
          );
          return Response.json(
            status === 200 ? verified : { private: "account exists" },
            { status },
          );
        };
        const response = await customerAuthAction(
          request(),
          {
            action,
            email: verified.email,
            password: "A-valid-password",
            name: "Customer",
            role: "admin",
            id: "forged",
          },
          limit,
        );
        assert.equal(response.headers.has("set-cookie"), false);
        responses.push(await response.json());
      }
      assert.deepEqual(responses[0], responses[1]);
      assert.deepEqual(responses[1], responses[2]);
    }
    globalThis.fetch = async (_url, init) => {
      if (init?.method === "PUT")
        assert.deepEqual(JSON.parse(String(init.body)), {
          data: { name: "Changed" },
        });
      return Response.json(verified);
    };
    const response = await customerAuthAction(
      request("blies_customer_access=valid.access"),
      {
        action: "profile",
        name: " Changed ",
        role: "admin",
        email: "forged@example.test",
        id: "forged",
      },
      limit,
    );
    assert.deepEqual(await response.json(), {
      user: { id, email: verified.email, name: "Changed" },
    });
    await assert.rejects(
      customerAuthAction(
        request(),
        { action: "login", email: verified.email, password: "validpassword" },
        async () => false,
      ),
      (error) => error instanceof CustomerAuthError && error.status === 429,
    );
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(
      customerAuthAction(
        request(),
        { action: "recover", email: verified.email },
        limit,
      ),
      StorageUnavailable,
    );
  } finally {
    globalThis.fetch = oldFetch;
    process.env = old;
  }
});

test("logout revokes refresh-only sessions and clears cookies without claiming provider outage success", async () => {
  const oldFetch = globalThis.fetch,
    old = { ...process.env };
  process.env.BLIES_SUPABASE_URL = "https://test.supabase.co";
  process.env.BLIES_SUPABASE_ANON_KEY = "public-test-only";
  process.env.BLIES_PUBLIC_ORIGINS = "https://frontend.example";
  try {
    const calls: string[] = [];
    globalThis.fetch = async (url, init) => {
      const path = new URL(String(url)).pathname + new URL(String(url)).search;
      calls.push(path);
      if (path.includes("refresh_token")) {
        assert.deepEqual(JSON.parse(String(init?.body)), {
          refresh_token: "old-refresh",
        });
        return Response.json({ access_token: "rotated.access" });
      }
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer rotated.access",
      );
      return new Response(null, { status: 204 });
    };
    const response = await customerAuthAction(
      request("blies_customer_refresh=old-refresh"),
      { action: "logout" },
      limit,
    );
    assert.deepEqual(await response.json(), { ok: true });
    assert.deepEqual(calls, [
      "/auth/v1/token?grant_type=refresh_token",
      "/auth/v1/logout?scope=local",
    ]);
    for (const cookie of response.headers.getSetCookie())
      assert.match(cookie, /Max-Age=0/);
    globalThis.fetch = async () => new Response(null, { status: 503 });
    const unavailable = await customerAuthAction(
      request("blies_customer_refresh=old-refresh"),
      { action: "logout" },
      limit,
    );
    assert.equal(unavailable.status, 503);
    for (const cookie of unavailable.headers.getSetCookie())
      assert.match(cookie, /Max-Age=0/);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = old;
  }
});
