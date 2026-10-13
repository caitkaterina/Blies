import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedBody, BodyTooLarge } from "../lib/request-body.ts";
test("actual streamed body limit is enforced without trusting Content-Length", async () => {
  const req = new Request("https://example.test", {
    method: "POST",
    body: "large body",
    headers: { "Content-Length": "1" },
  });
  await assert.rejects(boundedBody(req, 3), BodyTooLarge);
  assert.equal(
    new TextDecoder().decode(
      await boundedBody(
        new Request("https://example.test", { method: "POST", body: "ok" }),
        3,
      ),
    ),
    "ok",
  );
});
