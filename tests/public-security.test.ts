import { test } from "node:test";
import assert from "node:assert/strict";
import { publicOrigin, publicCors, sameOrigin } from "../lib/security.ts";
import { contactSchema } from "../lib/validation.ts";
test("public frontend origins do not expand administrator same-origin permission", () => {
  const old = process.env.BLIES_PUBLIC_ORIGINS;
  process.env.BLIES_PUBLIC_ORIGINS = "https://frontend.example";
  try {
    const req = new Request("https://backend.example/api/contact", {
      headers: { Origin: "https://frontend.example" },
    });
    assert.equal(publicOrigin(req), true);
    assert.equal(sameOrigin(req), false);
    const response = publicCors(req, new Response());
    assert.equal(
      response.headers.get("Access-Control-Allow-Origin"),
      "https://frontend.example",
    );
    assert.equal(
      response.headers.has("Access-Control-Allow-Credentials"),
      false,
    );
    assert.equal(
      publicOrigin(
        new Request(req.url, {
          headers: { Origin: "https://frontend.example.evil" },
        }),
      ),
      false,
    );
    assert.equal(publicOrigin(new Request(req.url)), false);
  } finally {
    if (old === undefined) delete process.env.BLIES_PUBLIC_ORIGINS;
    else process.env.BLIES_PUBLIC_ORIGINS = old;
  }
});
test("contact requires consent and rejects invalid or spam submissions", () => {
  const data = {
    locale: "en",
    name: "Client",
    email: "client@example.com",
    message: "Please help",
    consent: true,
  };
  assert.equal(contactSchema.safeParse(data).success, true);
  for (const change of [
    { consent: false },
    { email: "bad" },
    { message: "" },
    { website: "spam" },
  ])
    assert.equal(
      contactSchema.safeParse({ ...data, ...change }).success,
      false,
    );
});
