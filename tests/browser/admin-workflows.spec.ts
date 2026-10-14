import { test, expect, type Page } from "@playwright/test";
import { createHmac, randomBytes, randomUUID } from "node:crypto";

const origin = "http://localhost:3001";

async function staffSession(page: Page, role: "admin" | "sales" | "editor") {
  // These signed cookies use an isolated, generated test secret and configured
  // fixture identities. The existing site suite separately exercises real MFA.
  const secret = process.env.BLIES_TEST_SESSION_SECRET;
  if (!secret) throw Error("The isolated test session secret is missing");
  const csrf = randomBytes(24).toString("hex");
  const body = Buffer.from(
    JSON.stringify({
      user: `workflow-${role}@example.test`,
      role,
      csrf,
      exp: Date.now() + 3600000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  await page.context().addCookies([
    {
      name: "blies_admin",
      value: `${body}.${signature}`,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
    },
  ]);
  return { Origin: origin, "x-csrf-token": csrf };
}

test("sales can persist a shipment and append genuine tracking events", async ({
  page,
}) => {
  await staffSession(page, "sales");
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: "audit", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "shipments", exact: true }).click();
  await expect(
    page.getByText("Local development has no customer account registry.", {
      exact: false,
    }),
  ).toBeVisible();
  const reference = `STAGING-${randomUUID()}`;
  const customerId = randomUUID();
  // A fixture customer UUID is used only by the isolated SQLite test backend.
  // Supabase creation additionally requires an actual auth.users foreign key.
  await page.getByLabel("Shipment reference", { exact: true }).fill(reference);
  await page.getByLabel("Customer account UUID").fill(customerId);
  await page.getByLabel("Initial status").fill("Cargo received at depot");
  await page.getByLabel("Initial location").fill("Johannesburg depot");
  await page.getByLabel("Initial update description").fill("Received by staff");
  await page
    .getByRole("button", { name: "Create shipment", exact: true })
    .click();
  await expect(page.locator(".warning[role=status]")).toContainText(
    "Saved successfully",
  );
  await page.getByLabel("Search shipments").fill(reference);
  const shipment = page.locator(".admin-record").filter({ hasText: reference });
  await expect(shipment).toHaveCount(1);
  await shipment.getByLabel("Updated status").fill("Border documents cleared");
  await shipment.getByLabel("Update location", { exact: true }).fill("Lebombo");
  await shipment
    .getByLabel("Update description", { exact: true })
    .fill("Staff confirmed clearance");
  await shipment.getByRole("button", { name: "Add shipment update" }).click();
  await expect(shipment).toContainText("Border documents cleared");
  await expect(shipment.locator("ol li")).toHaveCount(2);
  const response = await page.request.get("/api/admin/shipments");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const stored = (await response.json()).shipments.find(
    (item: { reference: string }) => item.reference === reference,
  );
  expect(stored.customerId).toBe(customerId);
  expect(stored.status).toBe("Border documents cleared");
  expect(
    stored.events.map((event: { status: string }) => event.status),
  ).toEqual(["Cargo received at depot", "Border documents cleared"]);
  await page.reload();
  await page.getByRole("button", { name: "shipments", exact: true }).click();
  await page.getByLabel("Search shipments").fill(reference);
  await expect(
    page.locator(".admin-record").filter({ hasText: reference }),
  ).toContainText("Staff confirmed clearance");
});

test("shipment mutations enforce CSRF, ownership input validation and duplicate references", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/shipments")).status()).toBe(403);
  const headers = await staffSession(page, "sales");
  const input = {
    action: "create",
    reference: `STAGING-${randomUUID()}`,
    customerId: randomUUID(),
    status: "Booked by staff",
    location: "",
    description: "",
  };
  expect(
    (await page.request.post("/api/admin/shipments", { data: input })).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/admin/shipments", {
        headers: { ...headers, Origin: "https://frontend.example" },
        data: input,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/admin/shipments", {
        headers,
        data: { ...input, customerId: "unverified-email@example.test" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await page.request.post("/api/admin/shipments", {
        headers,
        data: { ...input, actor: "forged@example.test" },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await page.request.post("/api/admin/shipments", { headers, data: input })
    ).status(),
  ).toBe(201);
  expect(
    (
      await page.request.post("/api/admin/shipments", { headers, data: input })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post("/api/admin/shipments", {
        headers,
        data: {
          action: "update",
          id: randomUUID(),
          status: "Delivered",
          customerId: randomUUID(),
        },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await page.request.post("/api/admin/shipments", {
        headers,
        data: { action: "update", id: randomUUID(), status: "Delivered" },
      })
    ).status(),
  ).toBe(404);
});

test("audit action metadata and notification retries require administrator permission", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/audit")).status()).toBe(403);
  expect((await request.post("/api/admin/notifications")).status()).toBe(403);
  const headers = await staffSession(page, "admin");
  const reference = `STAGING-${randomUUID()}`;
  expect(
    (
      await page.request.post("/api/admin/shipments", {
        headers,
        data: {
          action: "create",
          reference,
          customerId: randomUUID(),
          status: "Scheduled",
        },
      })
    ).status(),
  ).toBe(201);
  const audit = await page.request.get("/api/admin/audit");
  expect(audit.status()).toBe(200);
  expect(audit.headers()["cache-control"]).toContain("no-store");
  const rows = (await audit.json()).audit;
  expect(
    rows.some(
      (row: { actor: string; event: string }) =>
        row.actor === "workflow-admin@example.test" &&
        row.event === "shipment.created",
    ),
  ).toBeTruthy();
  for (const row of rows)
    expect(Object.keys(row).sort()).toEqual([
      "actor",
      "created",
      "event",
      "id",
      "target",
    ]);
  expect(
    (
      await page.request.post("/api/admin/notifications", { data: {} })
    ).status(),
  ).toBe(403);
  await page.goto("/admin");
  await page.getByRole("button", { name: "audit", exact: true }).click();
  await page.getByLabel("Search audit records").fill("shipment.created");
  await expect(page.locator(".admin-record").first()).toContainText(
    "shipment.created",
  );
  await page
    .getByRole("button", { name: "Retry pending notifications" })
    .click();
  await expect(page.locator(".warning[role=status]")).toContainText(
    "Email delivery is not configured",
  );
  const afterRetry = (await (await page.request.get("/api/admin/audit")).json())
    .audit;
  expect(
    afterRetry.some(
      (row: { event: string }) => row.event === "notification.retry",
    ),
  ).toBeTruthy();
});

test("editor and sales permissions deny unrelated administrative workflows", async ({
  page,
}) => {
  for (const role of ["editor", "sales"] as const) {
    const headers = await staffSession(page, role);
    expect((await page.request.get("/api/admin/audit")).status()).toBe(403);
    expect((await page.request.get("/api/admin/customers")).status()).toBe(
      role === "sales" ? 200 : 403,
    );
    expect(
      (
        await page.request.post("/api/admin/notifications", {
          headers,
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect((await page.request.get("/api/admin/shipments")).status()).toBe(
      role === "sales" ? 200 : 403,
    );
    if (role === "editor") {
      const content = await page.request.get("/api/admin/content");
      expect(content.status()).toBe(200);
      expect((await content.json()).audit).toEqual([]);
      expect(
        (
          await page.request.post("/api/admin/shipments", {
            headers,
            data: {
              action: "create",
              reference: `STAGING-${randomUUID()}`,
              customerId: randomUUID(),
              status: "Created",
            },
          })
        ).status(),
      ).toBe(403);
    }
    await page.goto("/admin");
    await expect(
      page.getByRole("button", { name: "audit", exact: true }),
    ).toHaveCount(0);
    if (role === "editor")
      await expect(
        page.getByRole("button", { name: "shipments", exact: true }),
      ).toHaveCount(0);
  }
});

test("customer directory is protected and reports absent local Auth honestly", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/customers")).status()).toBe(403);
  await staffSession(page, "admin");
  const response = await page.request.get("/api/admin/customers?page=1");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ customers: [], configured: false });
  for (const pageNumber of ["0", "-1", "1.5", "1001", "invalid"])
    expect(
      (
        await page.request.get(`/api/admin/customers?page=${pageNumber}`)
      ).status(),
    ).toBe(400);
});

test("staff preserve enquiry statuses and report saved replies without claiming email delivery", async ({
  page,
}) => {
  await staffSession(page, "sales");
  const submitted = await page.request.post("/api/contact", {
    headers: { Origin: origin },
    data: {
      locale: "en",
      name: "Local workflow fixture",
      email: `workflow-${randomUUID()}@example.test`,
      company: "Isolated browser test",
      message: "Please review this staging enquiry.",
      consent: true,
    },
  });
  expect(submitted.status()).toBe(201);
  const reference = (await submitted.json()).reference;
  await page.goto("/admin");
  await page.getByLabel("Search enquiries").fill(reference);
  const enquiry = page.locator(".admin-record").filter({ hasText: reference });
  await expect(enquiry).toHaveCount(1);
  await expect(
    enquiry
      .getByRole("combobox", { name: "Status", exact: true })
      .locator("option"),
  ).toHaveText(["received", "in-review", "responded", "closed"]);
  await enquiry
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("in-review");
  await enquiry.getByLabel("Assigned to").fill("Operations team");
  await enquiry
    .getByLabel("Internal response draft")
    .fill("Your enquiry is being reviewed.");
  await enquiry
    .getByRole("button", { name: "Save internal follow-up" })
    .click();
  await expect(page.locator(".warning[role=status]")).toContainText(
    "Saved successfully",
  );
  let saved = (
    await (await page.request.get("/api/admin/records")).json()
  ).records.find((row: { id: string }) => row.id === reference);
  expect(saved.status).toBe("in-review");
  expect(saved.assigned).toBe("Operations team");
  expect(saved.reply).toBe("Your enquiry is being reviewed.");
  await enquiry.getByRole("button", { name: "Send response by email" }).click();
  await expect(page.locator(".warning[role=status]")).toContainText(
    "Email delivery is not configured",
  );
  saved = (
    await (await page.request.get("/api/admin/records")).json()
  ).records.find((row: { id: string }) => row.id === reference);
  expect(saved.status).toBe("responded");
  expect(saved.email_status).not.toBe("sent");
  await page.reload();
  await page.getByLabel("Search enquiries").fill(reference);
  await expect(
    page
      .locator(".admin-record")
      .filter({ hasText: reference })
      .getByLabel("Assigned to"),
  ).toHaveValue("Operations team");
});
