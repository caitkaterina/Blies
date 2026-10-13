import { requirePersistence } from "./storage-policy";
import { uploadsReady } from "./capabilities";
import { publicOrigin } from "@/lib/security";
import "server-only";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { rateLimit, createEnquiry, setEmailStatus } from "./persistence";
import { putFile, removeFile } from "./private-files";
import {
  allowedTypes,
  fileType,
  quoteSchema,
  trackingSchema,
  contactSchema,
} from "./validation";
import { boundedBody, BodyTooLarge } from "./request-body";
import { ui, type Locale } from "./i18n";
export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
export async function sendConfirmation(
  email: string,
  locale: Locale,
  reference: string,
) {
  if (!process.env.BLIES_EMAIL_API_KEY || !process.env.BLIES_EMAIL_FROM)
    return "not-configured";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLIES_EMAIL_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `blies-confirm-${reference}`,
      },
      body: JSON.stringify({
        from: process.env.BLIES_EMAIL_FROM,
        to: [email],
        subject: `BLIES — ${ui.reference[locale]} ${reference}`,
        text: `${ui.saved[locale]}\n${ui.reference[locale]}: ${reference}\n${ui.turnaround[locale]}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok ? "sent" : "pending";
  } catch {
    return "pending";
  }
}
export async function sendReply(
  email: string,
  locale: Locale,
  reference: string,
  reply: string,
) {
  if (!process.env.BLIES_EMAIL_API_KEY || !process.env.BLIES_EMAIL_FROM)
    return "not-configured";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLIES_EMAIL_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `blies-reply-${createHash("sha256")
          .update(reference + reply)
          .digest("hex")}`,
      },
      body: JSON.stringify({
        from: process.env.BLIES_EMAIL_FROM,
        to: [email],
        subject: `BLIES — ${ui.reference[locale]} ${reference}`,
        text: `BLIES\n${ui.reference[locale]}: ${reference}\n\n${reply}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok ? "sent" : "pending";
  } catch {
    return "pending";
  }
}
export async function receive(
  req: Request,
  kind: "quote" | "tracking" | "contact",
) {
  if (!publicOrigin(req)) return error("Origin not allowed", 403);
  requirePersistence();
  // Avoid trusting arbitrary X-Forwarded-For. Deploy behind a gateway that supplies a trusted identity.
  const identity =
    process.env.BLIES_TRUST_PROXY === "true"
      ? req.headers.get("x-real-ip") || "unknown"
      : "shared";
  if (!(await rateLimit(`public:${identity}`, 20, 600)))
    return error("Too many requests", 429);
  if (
    Number(req.headers.get("content-length") || 0) >
    (process.env.BLIES_STORAGE_MODE === "supabase" ? 3 : 31) * 1024 * 1024
  )
    return error("Request too large", 413);
  let data: Record<string, unknown>;
  let files: File[] = [];
  try {
    const bytes = await boundedBody(
      req,
      kind === "quote"
        ? (process.env.BLIES_STORAGE_MODE === "supabase" ? 3 : 31) * 1024 * 1024
        : 20000,
    );
    if (kind === "quote") {
      const form = await new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: bytes,
      }).formData();
      const raw = form.get("data");
      if (typeof raw !== "string" || raw.length > 20000)
        return error("Invalid request");
      data = JSON.parse(raw);
      files = form
        .getAll("files")
        .filter((v): v is File => v instanceof File && v.size > 0);
    } else {
      const raw = new TextDecoder().decode(bytes);
      if (raw.length > 20000) return error("Request too large", 413);
      data = JSON.parse(raw);
    }
  } catch (e) {
    if (e instanceof BodyTooLarge) return error("Request too large", 413);
    return error("Invalid request");
  }
  const parsed = (
    kind === "quote"
      ? quoteSchema
      : kind === "contact"
        ? contactSchema
        : trackingSchema
  ).safeParse(data);
  if (!parsed.success)
    return Response.json(
      {
        error: "Validation failed",
        fields: parsed.error.issues.map((i) => i.path.join(".")),
      },
      { status: 422 },
    );
  if (files.length > 3) return error("Too many files");
  if (files.length && !uploadsReady())
    return error("Secure document uploads are not configured", 503);
  const emailHash = createHash("sha256")
    .update(parsed.data.email.toLowerCase())
    .digest("hex");
  if (!(await rateLimit(`email:${emailHash}`, 5, 3600)))
    return error("Too many requests", 429);
  const reference = `BLIES-${kind === "quote" ? "Q" : kind === "contact" ? "C" : "T"}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const docs: {
    id: string;
    name: string;
    type: string;
    file: string;
    buffer: Buffer;
  }[] = [];
  for (const f of files) {
    if (
      f.size >
        (process.env.BLIES_STORAGE_MODE === "supabase" ? 2 : 10) *
          1024 *
          1024 ||
      !allowedTypes.includes(f.type)
    )
      return error("Invalid file size or type");
    const buffer = Buffer.from(await f.arrayBuffer());
    const type = fileType(buffer);
    if (!type || type !== f.type)
      return error("File content does not match type");
    try {
      const scan = await fetch(process.env.BLIES_SCAN_URL!, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.BLIES_SCAN_KEY}`,
          "Content-Type": type,
        },
        body: buffer,
        signal: AbortSignal.timeout(30000),
      });
      if (!scan.ok) return error("Document scanning unavailable", 503);
      const result = await scan.json();
      if (result.clean !== true)
        return error("Document rejected by malware scanner", 422);
    } catch {
      return error("Document scanning unavailable", 503);
    }
    const id = randomUUID();
    docs.push({
      id,
      name: path.basename(f.name).slice(0, 200),
      type,
      file: id,
      buffer,
    });
  }
  const written: string[] = [];
  try {
    if (
      process.env.BLIES_STORAGE_MODE === "supabase" &&
      docs.reduce((n, d) => n + d.buffer.length, 0) > 2 * 1024 * 1024
    )
      return error("Combined files exceed 2 MB", 413);
    for (const doc of docs) {
      await putFile(doc.file, doc.type, doc.buffer);
      written.push(doc.file);
    }
    const service = "service" in parsed.data ? parsed.data.service : kind;
    const queue = ["procurement", "equipment"].includes(String(service))
      ? "procurement"
      : service === "integrated"
        ? "integrated"
        : "logistics";
    await createEnquiry(
      reference,
      kind,
      queue,
      parsed.data,
      docs.map((d) => ({ id: d.id, name: d.name, type: d.type, file: d.file })),
    );
  } catch {
    await Promise.all(written.map((f) => removeFile(f).catch(() => {})));
    return error("Storage unavailable", 503);
  }
  const emailStatus = await sendConfirmation(
    parsed.data.email,
    parsed.data.locale,
    reference,
  );
  // A delivery-state write failure must not turn a committed enquiry into a false submission failure.
  await setEmailStatus(reference, emailStatus).catch(() =>
    console.warn("BLIES email state update pending"),
  );
  return Response.json(
    { reference, received: true, emailStatus },
    { status: 201 },
  );
}
