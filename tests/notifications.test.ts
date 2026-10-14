import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const testRuntime = globalThis as typeof globalThis & {
  __bliesAfterTasks: (() => Promise<void>)[];
};
testRuntime.__bliesAfterTasks = [];
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/server")
      return {
        url: "data:text/javascript,export function after(callback){globalThis.__bliesAfterTasks.push(callback)}",
        shortCircuit: true,
      };
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith(".") && !/\.[^/]+$/.test(specifier))
      return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});
test("durable SQLite outbox uses provider idempotency, never claims rejected mail sent and retries explicitly", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "blies-notifications-"));
  const prior = { ...process.env };
  const oldFetch = globalThis.fetch;
  process.env.BLIES_STORAGE_MODE = "sqlite";
  process.env.BLIES_DATA_DIR = dir;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  delete process.env.BLIES_EMAIL_API_KEY;
  delete process.env.BLIES_EMAIL_FROM;
  const { db } = await import("../lib/store.ts");
  const {
    claimSubmission,
    submitEnquiry,
    retryConfirmation,
    resolveSubmission,
  } = await import("../lib/delivery-store.ts");
  const { drainOutbox } = await import("../lib/notifications.ts");
  const { scheduleOutbox } = await import("../lib/outbox-scheduler.ts");
  const connection = db();
  try {
    const claim = await claimSubmission("request-key", "hash", "BLIES-C-TEST");
    assert.equal(claim.state, "claimed");
    if (claim.state !== "claimed") throw Error("Claim failed");
    await submitEnquiry(
      "request-key",
      claim.token,
      claim.reference,
      "contact",
      "logistics",
      {
        email: "test@example.test",
        name: "Test",
        locale: "en",
        consent: true,
        message: "<script>unsafe</script>",
      },
      [],
      null,
    );
    assert.deepEqual(await drainOutbox(), {
      sent: 0,
      pending: 0,
      notConfigured: true,
    });
    process.env.BLIES_EMAIL_API_KEY = "test-only";
    process.env.BLIES_EMAIL_FROM = "BLIES <test@example.test>";
    scheduleOutbox();
    assert.equal(testRuntime.__bliesAfterTasks.length, 1);
    const keys: string[] = [];
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), "https://api.resend.com/emails");
      keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
      assert.ok(
        JSON.parse(String(init?.body)).html.includes("BLIES (Pty) Ltd"),
      );
      return new Response("rejected", { status: 503 });
    };
    assert.deepEqual(await drainOutbox(), {
      sent: 0,
      pending: 1,
      notConfigured: false,
    });
    await testRuntime.__bliesAfterTasks[0]();
    assert.notEqual(
      connection.prepare("SELECT state FROM email_outbox").get()!.state,
      "sent",
    );
    assert.equal(
      await retryConfirmation(claim.reference, {
        email: "test@example.test",
        locale: "en",
      }),
      "pending",
    );
    globalThis.fetch = async (_url, init) => {
      keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
      return Response.json({ id: "test-provider-accepted" });
    };
    assert.deepEqual(await drainOutbox(), {
      sent: 1,
      pending: 0,
      notConfigured: false,
    });
    assert.equal(keys[0], keys[1]);
    assert.equal(await retryConfirmation(claim.reference, {}), "sent");
    assert.equal((await drainOutbox()).sent, 0);
    const resolution = await resolveSubmission(
      "request-key",
      "hash",
      claim.token,
    );
    assert.equal(resolution.state, "complete");
    const second = await claimSubmission("pending-key", "hash", "UNCOMMITTED");
    if (second.state !== "claimed") throw Error("Claimfailed");
    assert.equal(
      (await resolveSubmission("pending-key", "hash", second.token)).state,
      "aborted",
    );
    await assert.rejects(
      submitEnquiry(
        "pending-key",
        second.token,
        second.reference,
        "contact",
        "logistics",
        { email: "test@example.test", locale: "en", consent: true },
        [],
        null,
      ),
    );
  } finally {
    globalThis.fetch = oldFetch;
    connection.close();
    for (const key of Object.keys(process.env))
      if (!(key in prior)) delete process.env[key];
    Object.assign(process.env, prior);
    rmSync(dir, { recursive: true, force: true });
  }
});
