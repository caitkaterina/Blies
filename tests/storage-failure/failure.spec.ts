import { test, expect } from "@playwright/test";
test("unavailable persistent-host CMS does not break marketing pages", async ({
  request,
}) => {
  for (const route of [
    "/en",
    "/fr",
    "/ar",
    "/en/contact",
    "/en/insights",
    "/en/fleet",
    "/sitemap.xml",
  ])
    expect((await request.get(route)).status(), route).toBe(200);
});
test("filesystem initialization failure returns sanitized 503, never a fake record or path leak", async ({
  request,
}) => {
  for (const route of ["/api/quotes", "/api/tracking"]) {
    const common = {
      locale: "en",
      company: "Test company",
      name: "Test person",
      email: "storage-failure@example.test",
      phone: "+27123456789",
      consent: true,
    };
    const options =
      route === "/api/quotes"
        ? {
            multipart: {
              data: JSON.stringify({
                ...common,
                service: "road",
                originCountry: "South Africa",
                originCity: "Johannesburg",
                destinationCountry: "Gabon",
                destinationCity: "Libreville",
                cargo: "Test cargo",
                quantity: 1,
                unit: "pallet",
                date: "",
                urgency: "Standard",
              }),
            },
          }
        : { data: { ...common, shipment: "TEST-STORAGE-FAILURE" } };
    const r = await request.post(route, {
      headers: { Origin: "http://localhost:3005" },
      ...options,
    });
    expect(r.status()).toBe(503);
    const body = await r.json();
    expect(body.code).toBe("BACKEND_UNAVAILABLE");
    expect(body.reference).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("/dev/null");
  }
});
test("MFA login fails before issuing a cookie when security-state storage is unavailable", async ({
  request,
}) => {
  const r = await request.post("/api/admin/login", {
    headers: { Origin: "http://localhost:3005" },
    data: {
      email: "test-admin@example.test",
      password: "invalid",
      code: "000000",
    },
  });
  expect(r.status()).toBe(503);
  expect(r.headers()["set-cookie"]).toBeUndefined();
  expect((await request.get("/api/admin/records")).status()).toBe(403);
});
