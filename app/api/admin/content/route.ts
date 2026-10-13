import { backendRequest } from "@/lib/backend";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authorise } from "@/lib/auth";
import { contentState, saveContent } from "@/lib/persistence";
const translation = z.object({
  en: z.string().min(1).max(12000),
  fr: z.string().min(1).max(12000),
  ar: z.string().min(1).max(12000),
});
const schema = z
  .object({
    id: z.string().optional(),
    kind: z.enum([
      "service",
      "industry",
      "fleet",
      "location",
      "article",
      "settings",
    ]),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/)
      .max(120),
    status: z.enum(["draft", "published", "archived"]),
    position: z.number().int().min(0).max(10000),
    data: z.object({
      title: translation,
      intro: translation,
      points: z.array(translation).max(20).default([]),
      verified: z.boolean(),
      x: z.number().min(0).max(100).optional(),
      y: z.number().min(0).max(100).optional(),
      owned: z.boolean().optional(),
      planned: z.boolean().optional(),
      specifications: z.string().max(5000).optional(),
      imageUrl: z
        .union([z.literal(""), z.url().refine((v) => v.startsWith("https://"))])
        .optional(),
      videoUrl: z
        .union([z.literal(""), z.url().refine((v) => v.startsWith("https://"))])
        .optional(),
      certifications: z.string().max(5000).optional(),
      tracking: z.boolean().optional(),
      author: z.string().max(200).optional(),
      publicationDate: z.string().max(10).optional(),
      category: translation.optional(),
      metaDescription: translation.optional(),
      locationRole: z
        .enum(["base", "operating", "sourcing", "destination", "coverage"])
        .optional(),
      phone: z
        .string()
        .regex(/^\+?[0-9\s().-]{8,30}$/)
        .optional(),
      corporateEmail: z.union([z.literal(""), z.email()]).optional(),
      salesEmail: z.union([z.literal(""), z.email()]).optional(),
      procurementEmail: z.union([z.literal(""), z.email()]).optional(),
      logisticsEmail: z.union([z.literal(""), z.email()]).optional(),
      quotationsEmail: z.union([z.literal(""), z.email()]).optional(),
      whatsapp: z
        .string()
        .regex(/^\+?\d{8,15}$/)
        .optional(),
    }),
  })
  .superRefine((v, c) => {
    if (
      v.status === "published" &&
      (!v.data.verified ||
        (v.kind === "fleet" && (!v.data.owned || v.data.planned)))
    )
      c.addIssue({
        code: "custom",
        message:
          "Only verified content and confirmed owned fleet can be published",
      });
  });
async function getHandler(req: Request) {
  if (!(await authorise(req, ["admin", "editor"])))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await contentState());
}
async function postHandler(req: Request) {
  const s = await authorise(req, ["admin", "editor"], true);
  if (!s) return Response.json({ error: "Forbidden" }, { status: 403 });
  let raw;
  try {
    const body = await req.text();
    if (body.length > 100000) throw Error();
    raw = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return Response.json(
      { error: "Invalid content", issues: parsed.error.issues },
      { status: 422 },
    );
  if (
    parsed.data.kind === "article" &&
    !parsed.data.slug.startsWith("insights/")
  )
    parsed.data.slug = `insights/${parsed.data.slug}`;
  if (parsed.data.kind === "fleet" && !parsed.data.slug.startsWith("fleet/"))
    parsed.data.slug = `fleet/${parsed.data.slug}`;
  const v = parsed.data,
    id = v.id || randomUUID();
  try {
    await saveContent(s.user, v, id);
    return Response.json({ id });
  } catch {
    return Response.json(
      { error: "Could not save; check for duplicate slugs" },
      { status: 409 },
    );
  }
}

export async function GET(request: Request) {
  return backendRequest(() => getHandler(request));
}

export async function POST(request: Request) {
  return backendRequest(() => postHandler(request));
}
