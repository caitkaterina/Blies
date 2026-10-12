import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { pages, services, articles } from "../../lib/content";
function totp() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = Array.from(process.env.BLIES_TEST_TOTP!)
    .map((c) => chars.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(
    (bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)),
  );
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(b).digest();
  return ((h.readUInt32BE(h[19] & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
test("all sitemap routes render in three languages", async ({ request }) => {
  for (const locale of ["en", "fr", "ar"])
    for (const slug of [
      ...pages.map((p) => p.slug),
      ...articles.map((a) => `insights/${a.slug}`),
      "",
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
    }
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
});
test("every navigator selection pre-fills its quotation service", async ({
  page,
}) => {
  await page.goto("/en");
  for (const s of services.slice(0, 11)) {
    await page
      .getByRole("button", {
        name: new RegExp(s.title.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    const href = await page
      .locator(".service-result .button")
      .getAttribute("href");
    expect(href).toBe(`/en/quote?service=${s.id}`);
  }
  await page.locator(".service-result .button").click();
  await expect(page.locator("select").first()).toHaveValue("integrated");
  await page.locator("select").first().selectOption("cold");
  await expect(page.locator("select").first()).toHaveValue("cold");
});
test("wizard records a real request and honestly reports pending email", async ({
  page,
}) => {
  await page.goto("/en/quote?service=cold");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Origin country").fill("South Africa");
  await page.getByLabel("Origin city").fill("Johannesburg");
  await page.getByLabel("Destination country").fill("Mozambique");
  await page.getByLabel("Destination city").fill("Maputo");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Cargo / product description").fill("Frozen food");
  await page.getByLabel("Unit of measurement").fill("pallets");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Required temperature")).toBeVisible();
  await page.getByLabel("Required temperature").fill("-18");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Urgency / deadline details").fill("Normal schedule");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Company name").fill("Browser validation company");
  await page.getByLabel("Contact name").fill("Test contact");
  await page
    .getByLabel("Business email")
    .fill(`test-${randomUUID()}@example.com`);
  await page.getByLabel("Telephone").fill("+27123456789");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("PDF, JPG or PNG.", { exact: false }),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "specification.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTest specification document\n%%EOF"),
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(
    page.getByRole("heading", { name: "Request received" }),
  ).toBeVisible();
  await expect(
    page.getByText("Email confirmation is pending", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".confirmation strong")).toHaveText(/BLIES-Q-/);
});
test("mobile navigation, action order, RTL and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ["en", "ar"]) {
    await page.goto(`/${locale}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator(".mobile-actions a")).toHaveCount(4);
    await expect(page.locator(".mobile-actions a").nth(0)).toHaveAttribute(
      "href",
      `/${locale}/quote`,
    );
    await expect(page.locator(".mobile-actions a").nth(1)).toHaveAttribute(
      "href",
      "tel:+27632400693",
    );
    await expect(page.locator(".mobile-actions a").nth(2)).toHaveAttribute(
      "href",
      `/${locale}/contact#whatsapp`,
    );
    await expect(page.locator(".mobile-actions a").nth(3)).toHaveAttribute(
      "href",
      `/${locale}/tracking`,
    );
    await page.locator(".menu-toggle").click();
    await expect(page.locator(".main-nav")).toBeVisible();
    await page.locator(".menu-toggle").click();
    await expect(page.locator(".main-nav")).not.toBeVisible();
  }
});
test("anonymous access, invalid submissions and cross-origin requests fail closed", async ({
  request,
}) => {
  expect((await request.get("/api/admin/records")).status()).toBe(403);
  expect(
    (await request.get("/api/admin/documents/not-a-real-id")).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/tracking", {
        headers: { Origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/tracking", {
        headers: { Origin: "http://localhost:3001" },
        data: {},
      })
    ).status(),
  ).toBe(422);
  const r = await request.get("/en");
  expect(r.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(r.headers()["content-security-policy"]).toContain("'strict-dynamic'");
});
test("MFA admin can edit, publish, archive and version multilingual CMS entries", async ({
  page,
}) => {
  const sample = {
    locale: "en",
    service: "road",
    originCountry: "South Africa",
    originCity: "Johannesburg",
    destinationCountry: "Mozambique",
    destinationCity: "Maputo",
    cargo: "Test cargo",
    quantity: 1,
    unit: "units",
    date: "",
    urgency: "Normal",
    company: "Test company",
    name: "Test person",
    email: `admin-test-${randomUUID()}@example.com`,
    phone: "+27123456789",
    consent: true,
  };
  const created = await page.request.post("/api/quotes", {
    headers: { Origin: "http://localhost:3001" },
    multipart: {
      data: JSON.stringify(sample),
      files: {
        name: "specification.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 Test document"),
      },
    },
  });
  expect(created.status()).toBe(201);
  await page.goto("/admin");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.BLIES_TEST_PASSWORD!);
  await page.getByLabel("Authenticator code").fill(totp());
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(
    page.getByRole("heading", { name: "Content & enquiries" }),
  ).toBeVisible();
  await page.getByLabel("Content type").selectOption("service");
  const slug = `test-service-${randomUUID().slice(0, 8)}`;
  await page.getByLabel("URL slug").fill(slug);
  for (const [i, l] of ["en", "fr", "ar"].entries()) {
    const set = page.locator("fieldset").nth(i);
    await set.getByLabel("Title", { exact: true }).fill(`Verified test ${l}`);
    await set.getByLabel("Introduction").fill(`Test content ${l}`);
  }
  await page.getByRole("checkbox", { name: "Management has verified" }).check();
  await page.getByLabel("Publication status").selectOption("published");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("status")).toContainText("Saved successfully");
  for (const l of ["en", "fr", "ar"])
    expect((await page.request.get(`/${l}/${slug}`)).status()).toBe(200);
  await page.getByRole("button", { name: "Verified test en" }).click();
  await page.getByLabel("Display order").fill("5");
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.getByRole("button", { name: "versions", exact: true }).click();
  await expect(page.locator("pre")).toContainText(slug);
  await page.getByRole("button", { name: "content", exact: true }).click();
  await page.getByRole("button", { name: "Verified test en" }).click();
  await page.getByLabel("Publication status").selectOption("archived");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("status")).toContainText("Saved successfully");
  expect((await page.request.get(`/en/${slug}`)).status()).toBe(404);
  await page.getByRole("button", { name: "enquiries", exact: true }).click();
  await expect(page.locator(".admin-record").first()).toBeVisible();
  await expect(page.locator(".document-links a").first()).toHaveText(
    "specification.pdf",
  );
  const documentUrl = await page
    .locator(".document-links a")
    .first()
    .getAttribute("href");
  const downloaded = await page.request.get(documentUrl!);
  expect(downloaded.status()).toBe(200);
  expect(downloaded.headers()["cache-control"]).toContain("no-store");
  expect(await downloaded.text()).toContain("%PDF-1.4");
});

test("WCAG automated checks on desktop, Arabic and quotation form", async ({
  page,
}) => {
  for (const route of ["/en", "/ar", "/en/quote", "/en/tracking"]) {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      route,
    ).toEqual([]);
  }
});
test("scanner verdict and file signature failures never create successful submissions", async ({
  request,
}) => {
  const base = {
    locale: "en",
    service: "road",
    originCountry: "South Africa",
    originCity: "Johannesburg",
    destinationCountry: "Mozambique",
    destinationCity: "Maputo",
    cargo: "Test cargo",
    quantity: 1,
    unit: "units",
    date: "",
    urgency: "Normal",
    company: "Test company",
    name: "Test person",
    email: `security-${randomUUID()}@example.com`,
    phone: "+27123456789",
    consent: true,
  };
  for (const buffer of [
    Buffer.from("MZ renamed executable"),
    Buffer.from("%PDF-1.4 EICAR test scanner rejection"),
  ]) {
    const r = await request.post("/api/quotes", {
      headers: { Origin: "http://localhost:3001" },
      multipart: {
        data: JSON.stringify(base),
        files: { name: "test.pdf", mimeType: "application/pdf", buffer },
      },
    });
    expect([400, 422]).toContain(r.status());
    expect((await r.json()).reference).toBeUndefined();
  }
});

test("editor and sales roles enforce separate authorisation and CSRF", async ({
  request,
}) => {
  for (const role of ["editor", "sales"]) {
    const login = await request.post("/api/admin/login", {
      headers: { Origin: "http://localhost:3001" },
      data: {
        email: `${role}@example.test`,
        password: process.env.BLIES_TEST_PASSWORD,
        code: totp(),
      },
    });
    expect(login.status()).toBe(200);
    expect((await request.get("/api/admin/content")).status()).toBe(
      role === "editor" ? 200 : 403,
    );
    expect((await request.get("/api/admin/records")).status()).toBe(
      role === "sales" ? 200 : 403,
    );
    expect(
      (
        await request.post("/api/admin/content", {
          headers: { Origin: "http://localhost:3001" },
          data: {},
        })
      ).status(),
    ).toBe(403);
  }
});

test("product navigator pre-fills category and language switching retains the journey", async ({
  page,
}) => {
  await page.goto("/en/procurement/categories");
  await page.getByRole("button", { name: "Uniforms & workwear" }).click();
  await page.locator(".category-result .button").click();
  await expect(page.locator("select").first()).toHaveValue("procurement");
  await page
    .locator(".site-header .languages")
    .getByRole("link", { name: "FR", exact: true })
    .click();
  await expect(page).toHaveURL(
    /\/fr\/quote\?service=procurement&category=workwear/,
  );
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByLabel("Pays d’origine").fill("Afrique du Sud");
  await page.getByLabel("Ville d’origine").fill("Johannesburg");
  await page.getByLabel("Pays de destination").fill("Gabon");
  await page.getByLabel("Ville de destination").fill("Libreville");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByLabel("Catégorie de produit")).toHaveValue(
    "Uniformes et vêtements de travail",
  );
});

test("editorial hub links resolve to their article pages", async ({ page }) => {
  for (const l of ["en", "fr", "ar"]) {
    await page.goto(`/${l}/insights`);
    const links = await page
      .locator(".article-grid a")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).pathname),
      );
    for (const link of links)
      expect((await page.request.get(link)).status(), link).toBe(200);
  }
});
