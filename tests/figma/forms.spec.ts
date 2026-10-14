import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
const query = (email: string) => {
  const db = new DatabaseSync(`${process.env.BLIES_TEST_DATA}/blies.sqlite`);
  try {
    return db
      .prepare(
        "SELECT id,kind,data FROM enquiries WHERE json_extract(data,'$.email')=?",
      )
      .all(email)
      .map((r) => ({
        id: String(r.id),
        kind: String(r.kind),
        data: JSON.parse(String(r.data)),
      }));
  } finally {
    db.close();
  }
};
test("Figma contact form confirms an actual backend commit and rejects invalid details", async ({
  page,
}) => {
  await page.goto("/#/en/contact");
  await page.locator("#c-name").fill("Integration visitor");
  await page.locator("#c-email").fill("invalid");
  await page.locator("#c-msg").fill("A contact request");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator("#c-email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#c-email").fill("figma-contact@example.test");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator("#form-note")).toContainText("BLIES-C-");
  const rows = query("figma-contact@example.test");
  expect(rows).toHaveLength(1);
  expect(rows[0].data).toMatchObject({
    name: "Integration visitor",
    message: "A contact request",
    consent: true,
  });
});
test("Figma quotation preserves route/cargo/specification fields and private file bytes", async ({
  page,
}) => {
  await page.goto("/#/en/quote");
  await page
    .getByRole("radio", { name: "Move cargo by road", exact: true })
    .check();
  const next = () =>
    page.getByRole("button", { name: "Continue", exact: true }).click();
  await next();
  for (const [id, value] of Object.entries({
    originCountry: "South Africa",
    originCity: "Johannesburg",
    destinationCountry: "Gabon",
    destinationCity: "Libreville",
  }))
    await page.locator("#q-" + id).fill(value);
  await next();
  await page.locator("#q-cargo").fill("Test specifications");
  await page.locator("#q-quantity").fill("3");
  await page.locator("#q-unit").fill("pallets");
  await next();
  await page.locator("#q-requirements").fill("Handle carefully");
  await next();
  await page.locator("#q-urgency").fill("Standard");
  await next();
  for (const [id, value] of Object.entries({
    company: "Test company",
    name: "Test contact",
    email: "figma-quote@example.test",
    phone: "+27123456789",
  }))
    await page.locator("#q-" + id).fill(value);
  await next();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "spec.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nIntegration scanner fixture document"),
    });
  await next();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("BLIES-Q-");
  const rows = query("figma-quote@example.test");
  expect(rows).toHaveLength(1);
  expect(rows[0].data).toMatchObject({
    service: "road",
    originCountry: "South Africa",
    destinationCountry: "Gabon",
    quantity: 3,
    requirements: "Handle carefully",
    consent: true,
  });
  const db = new DatabaseSync(`${process.env.BLIES_TEST_DATA}/blies.sqlite`);
  try {
    expect(
      db.prepare("SELECT name FROM documents WHERE enquiry=?").get(rows[0].id)
        ?.name,
    ).toBe("spec.pdf");
  } finally {
    db.close();
  }
});
test("submission retry keys replay one receipt and reject altered payloads", async ({
  request,
}) => {
  const headers = {
    Origin: "http://localhost:3006",
    "Idempotency-Key": "55555555-5555-4555-8555-555555555555",
    "X-BLIES-CSRF": "1",
  };
  const data = {
    locale: "en",
    name: "Retry client",
    email: "figma-retry@example.test",
    message: "Retry me",
    consent: true,
  };
  const a = await request.post("/api/contact", { headers, data });
  expect(a.status()).toBe(201);
  const b = await request.post("/api/contact", { headers, data });
  expect(b.status()).toBe(201);
  expect(await a.json()).toEqual(await b.json());
  expect(query(data.email)).toHaveLength(1);
  expect(
    (
      await request.post("/api/contact", {
        headers,
        data: { ...data, message: "Different" },
      })
    ).status(),
  ).toBe(409);
});
test("expired customer cookies cannot silently create unowned enquiries", async ({
  request,
}) => {
  const r = await request.post("/api/contact", {
    headers: {
      Origin: "http://localhost:3006",
      Cookie: "blies_customer_refresh=expired",
    },
    data: {
      locale: "en",
      name: "Expired",
      email: "expired@example.test",
      message: "Do not save as guest",
      consent: true,
    },
  });
  expect([401, 503]).toContain(r.status());
  expect(query("expired@example.test")).toHaveLength(0);
});
