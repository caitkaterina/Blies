import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteSchema, trackingSchema, fileType } from "../lib/validation.ts";
import { pages, services, locations, articles } from "../lib/content.ts";
const base = {
  locale: "en",
  service: "road",
  originCountry: "South Africa",
  originCity: "Johannesburg",
  destinationCountry: "Mozambique",
  destinationCity: "Maputo",
  cargo: "Equipment",
  quantity: 2,
  unit: "units",
  date: "",
  urgency: "Standard",
  company: "Test company",
  name: "Test person",
  email: "test@example.com",
  phone: "+27 12 345 6789",
  consent: true,
};
test("complete request accepted and normalized", () => {
  const result = quoteSchema.parse({ ...base, company: " Test company " });
  assert.equal(result.company, "Test company");
  assert.equal(result.weight, undefined);
});
test("invalid services, consent, email and numeric cargo quantities rejected", () => {
  for (const change of [
    { service: "fake" },
    { consent: false },
    { email: "broken" },
    { quantity: 0 },
    { quantity: -1 },
    { weight: -1 },
    { website: "spam" },
  ])
    assert.equal(quoteSchema.safeParse({ ...base, ...change }).success, false);
});
test("cold chain requires temperature while sea does not", () => {
  assert.equal(
    quoteSchema.safeParse({ ...base, service: "cold" }).success,
    false,
  );
  assert.equal(
    quoteSchema.safeParse({ ...base, service: "cold", temperature: "-18" })
      .success,
    true,
  );
  assert.equal(
    quoteSchema.safeParse({ ...base, service: "sea" }).success,
    true,
  );
});
test("past delivery dates are rejected", () => {
  assert.equal(
    quoteSchema.safeParse({ ...base, date: "2000-01-01" }).success,
    false,
  );
});
test("tracking requires a reference and consent", () => {
  const request = { ...base, shipment: "REF-123" };
  assert.equal(trackingSchema.safeParse(request).success, true);
  assert.equal(
    trackingSchema.safeParse({ ...request, shipment: "" }).success,
    false,
  );
  assert.equal(
    trackingSchema.safeParse({ ...request, consent: false }).success,
    false,
  );
});
test("signature checks reject renamed executables", () => {
  assert.equal(fileType(new Uint8Array([0x4d, 0x5a, 0, 0])), null);
  assert.equal(
    fileType(new Uint8Array([37, 80, 68, 70, 45])),
    "application/pdf",
  );
  assert.equal(
    fileType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(fileType(new Uint8Array([255, 216, 255])), "image/jpeg");
});
test("all service navigator journeys resolve to real pages", () => {
  assert.equal(services.slice(0, 11).length, 11);
  for (const s of services)
    assert.ok(
      pages.find((p) => p.slug === s.slug),
      s.slug,
    );
});
test("all published source content has three language versions", () => {
  for (const data of [
    ...pages.flatMap((p) => [p.title, p.intro, ...p.points]),
    ...locations.flatMap((p) => [p.title, p.role, p.description]),
    ...articles.flatMap((a) => [a.title, a.category, ...a.body]),
  ])
    for (const l of ["en", "fr", "ar"] as const) assert.ok(data[l].length > 0);
});
test("ships and aircraft ownership restrictions retained across languages", () => {
  const sea = pages.find((p) => p.slug === "logistics/sea")!,
    air = pages.find((p) => p.slug === "logistics/air")!;
  assert.match(sea.intro.en, /does not own ships/);
  assert.match(air.intro.en, /does not own aircraft/);
  assert.match(sea.intro.fr, /ne possède pas/);
  assert.match(air.intro.ar, /لا تمتلك/);
});
