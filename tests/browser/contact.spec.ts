import { test, expect } from "@playwright/test";
test("contact API persists enquiries, confirms receipt, enforces validation and keeps records private", async ({
  request,
}) => {
  const payload = {
    locale: "en",
    name: "Contact integration",
    email: "contact-test@example.test",
    company: "BLIES test",
    message: "A contact enquiry",
    consent: true,
  };
  const headers = { Origin: "http://localhost:3001" };
  const result = await request.post("/api/contact", { headers, data: payload });
  expect(result.status()).toBe(201);
  expect(await result.json()).toMatchObject({
    received: true,
    emailStatus: "not-configured",
  });
  const reference = (await result.json()).reference;
  expect(reference).toMatch(/^BLIES-C-/);
  // Independently query the isolated SQLite database to verify the stored payload.
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(`${process.env.BLIES_TEST_DATA}/blies.sqlite`);
  try {
    const row = db
      .prepare("SELECT data FROM enquiries WHERE id=?")
      .get(reference);
    expect(JSON.parse(row!.data as string)).toMatchObject(payload);
  } finally {
    db.close();
  }
  const invalid = await request.post("/api/contact", {
    headers,
    data: { ...payload, consent: false },
  });
  expect(invalid.status()).toBe(422);
  const forbidden = await request.post("/api/contact", {
    headers: { Origin: "https://evil.example" },
    data: payload,
  });
  expect(forbidden.status()).toBe(403);
  const cross = await request.post("/api/contact", {
    headers: { Origin: "https://frontend.example" },
    data: { ...payload, email: "cors@example.test" },
  });
  expect(cross.status()).toBe(201);
  expect(cross.headers()["access-control-allow-origin"]).toBe(
    "https://frontend.example",
  );
  expect(cross.headers()["access-control-allow-credentials"]).toBeUndefined();
  const preflight = await request.fetch("/api/contact", {
    method: "OPTIONS",
    headers: { Origin: "https://frontend.example" },
  });
  expect(preflight.status()).toBe(204);
  const records = await request.get("/api/admin/records");
  expect(records.status()).toBe(403);
  const update = await request.post("/api/admin/records", {
    headers,
    data: { id: reference, status: "closed", assigned: "", reply: "" },
  });
  expect(update.status()).toBe(403);
});
