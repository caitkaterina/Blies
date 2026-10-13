import { z } from "zod";
export const serviceIds = [
  "procurement",
  "equipment",
  "road",
  "mining",
  "cold",
  "sea",
  "air",
  "import",
  "export",
  "clearing",
  "integrated",
  "project",
] as const;
const text = z.string().trim().min(1).max(1000);
const optional = z.string().trim().max(2000).default("");
export const quoteSchema = z
  .object({
    locale: z.enum(["en", "fr", "ar"]),
    service: z.enum(serviceIds),
    originCountry: text,
    originCity: text,
    collection: optional,
    destinationCountry: text,
    destinationCity: text,
    crossBorder: optional,
    cargo: text,
    category: optional,
    quantity: z.coerce.number().positive().max(1e12),
    unit: text,
    weight: z
      .union([z.literal(""), z.coerce.number().positive().max(1e12)])
      .optional(),
    dimensions: optional,
    packaging: optional,
    temperature: optional,
    requirements: optional,
    dangerous: optional,
    date: z
      .string()
      .max(10)
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
    urgency: text,
    company: text,
    name: text,
    email: z.email().max(254),
    phone: z
      .string()
      .trim()
      .min(6)
      .max(40)
      .regex(/^[+\d\s().-]+$/),
    notes: optional,
    consent: z.literal(true),
    website: z.string().max(0).default(""),
  })
  .superRefine((v, c) => {
    if (v.service === "cold" && !v.temperature)
      c.addIssue({
        code: "custom",
        path: ["temperature"],
        message: "Temperature required",
      });
    if (
      v.date &&
      (Number.isNaN(Date.parse(v.date)) ||
        v.date < new Date().toISOString().slice(0, 10))
    )
      c.addIssue({
        code: "custom",
        path: ["date"],
        message: "Invalid delivery date",
      });
  });
export const trackingSchema = z.object({
  locale: z.enum(["en", "fr", "ar"]),
  shipment: text,
  company: text,
  name: text,
  email: z.email().max(254),
  phone: z.string().trim().min(6).max(40),
  notes: optional,
  consent: z.literal(true),
  website: z.string().max(0).default(""),
});
export function fileType(bytes: Uint8Array): string | null {
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
    return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return "image/png";
  return null;
}
export const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

export const contactSchema = z.object({
  locale: z.enum(["en", "fr", "ar"]),
  name: text,
  email: z.email().max(254),
  company: optional,
  message: z.string().trim().min(1).max(5000),
  consent: z.literal(true),
  website: z.string().max(0).default(""),
});
