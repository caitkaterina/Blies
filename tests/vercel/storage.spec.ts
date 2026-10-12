import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { pages, articles } from "../../lib/content";
test("all 126 public language routes and sitemap render against an unwritable storage path", async ({
  request,
}) => {
  for (const locale of ["en", "fr", "ar"])
    for (const slug of [
      "",
      ...pages.map((p) => p.slug),
      ...articles.map((a) => `insights/${a.slug}`),
      "quote",
      "contact",
      "tracking",
      "insights",
      "my-blies",
      "document-vault",
      "mode-recommender",
    ]) {
      const r = await request.get(`/${locale}/${slug}`);
      expect(r.status(), `${locale}/${slug}`).toBe(200);
      const html = await r.text();
      expect(html).toContain(`lang="${locale}"`);
      if (locale === "ar") expect(html).toContain('dir="rtl"');
      if (slug === "") expect(/hreflang="fr"/i.test(html)).toBe(true);
    }
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect(existsSync("/proc/blies-vercel-storage-denied")).toBe(false);
});
test("quotes, tracking and uploads return 503 without references, email states or accepted records", async ({
  request,
}) => {
  for (const route of ["/api/quotes", "/api/tracking"]) {
    const r = await request.post(route, {
      headers: { Origin: "http://localhost:3004" },
      data: {},
    });
    expect(r.status()).toBe(503);
    const body = await r.json();
    expect(body.code).toBe("BACKEND_UNAVAILABLE");
    expect(body.reference).toBeUndefined();
    expect(body.received).toBeUndefined();
    expect(body.emailStatus).toBeUndefined();
  }
  const upload = await request.post("/api/quotes", {
    headers: { Origin: "http://localhost:3004" },
    multipart: {
      data: "{}",
      files: {
        name: "rfq.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4"),
      },
    },
  });
  expect(upload.status()).toBe(503);
  expect(existsSync("/proc/blies-vercel-storage-denied")).toBe(false);
});
test("configured staff secrets do not open admin APIs, sign-in or private documents without persistence", async ({
  request,
}) => {
  const page = await request.get("/admin");
  expect(page.status()).toBe(200);
  expect(await page.text()).toContain("Administrator access is closed");
  for (const route of [
    "/api/admin/content",
    "/api/admin/records",
    "/api/admin/documents/anything",
  ])
    expect((await request.get(route)).status()).toBe(403);
  for (const route of [
    "/api/admin/content",
    "/api/admin/records",
    "/api/admin/logout",
  ])
    expect(
      (
        await request.post(route, {
          headers: { Origin: "http://localhost:3004" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  const login = await request.post("/api/admin/login", {
    headers: { Origin: "http://localhost:3004" },
    data: {},
  });
  expect(login.status()).toBe(503);
  expect(login.headers()["set-cookie"]).toBeUndefined();
});
test("cross-origin mutation rejection and security headers survive marketing-only deployment", async ({
  request,
}) => {
  for (const route of ["/api/quotes", "/api/tracking", "/api/admin/login"])
    expect(
      (
        await request.post(route, {
          headers: { Origin: "https://attacker.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  const r = await request.get("/ar");
  expect(r.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
});
test("translated unavailable messages, private upload gating and tracking failure never show success", async ({
  page,
}) => {
  await page.goto("/en/quote");
  await expect(
    page.getByText("Online requests are temporarily unavailable", {
      exact: false,
    }),
  ).toBeVisible();
  expect(await page.locator("input[type=file]").count()).toBe(0);
  for (const locale of ["en", "fr", "ar"]) {
    await page.goto(`/${locale}/tracking`);
    await expect(page.locator(".tracking-form .warning")).toBeVisible();
  }
  await page.goto("/en/tracking");
  for (const [name, value] of [
    ["Shipment reference", "TEST"],
    ["Company name", "Test company"],
    ["Contact name", "Test contact"],
    ["Business email", "test@example.com"],
    ["Telephone", "+27123456789"],
  ])
    await page.getByLabel(name).fill(value);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(
    page.locator(".tracking-form .form-error[role=alert]"),
  ).toContainText("No enquiry has been accepted");
  await expect(
    page.getByRole("heading", { name: "Request received" }),
  ).toHaveCount(0);
});
