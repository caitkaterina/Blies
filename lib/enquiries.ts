import { requirePersistence } from "./storage-policy";
import { uploadsReady } from "./capabilities";
import { publicOrigin } from "@/lib/security";
import "server-only";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { rateLimit } from "./persistence";
import { putFile, removeFile } from "./private-files";
import {
  allowedTypes,
  fileType,
  quoteSchema,
  trackingSchema,
  contactSchema,
} from "./validation";
import { boundedBody, BodyTooLarge } from "./request-body";
import {
  claimSubmission,
  releaseSubmission,
  resolveSubmission,
  submitEnquiry,
} from "./delivery-store";
import { customerIdentity } from "./customer-auth";
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
  if (
    process.env.BLIES_STORAGE_MODE === "supabase" &&
    files.reduce((n, f) => n + f.size, 0) > 2 * 1024 * 1024
  )
    return error("Combined files exceed 2 MB", 413);
  const customer = await customerIdentity(req);
  if (
    !customer &&
    /(?:^|;\s*)blies_customer_(?:access|refresh)=/.test(
      req.headers.get("cookie") || "",
    )
  )
    return error(
      "Customer session expired. Sign in again before submitting.",
      401,
    );
  const headerKey = req.headers.get("idempotency-key");
  if (headerKey && !/^[a-f0-9-]{36}$/i.test(headerKey))
    return error("Invalid submission key", 400);
  const key = createHash("sha256")
    .update(`${kind}:${customer?.id || "guest"}:${headerKey || randomUUID()}`)
    .digest("hex");
  const fingerprints = await Promise.all(
    files.map(async (f) =>
      createHash("sha256")
        .update(new Uint8Array(await f.arrayBuffer()))
        .digest("hex"),
    ),
  );
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        data: parsed.data,
        files: files.map((f, i) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          hash: fingerprints[i],
        })),
      }),
    )
    .digest("hex");
  const suggested = `BLIES-${kind === "quote" ? "Q" : kind === "contact" ? "C" : "T"}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const claim = await claimSubmission(key, hash, suggested);
  if (claim.state === "complete")
    return Response.json(claim.response, { status: 201 });
  if (claim.state === "conflict")
    return Response.json(
      {
        error: "Submission key was used for different details",
        code: "IDEMPOTENCY_CONFLICT",
      },
      { status: 409 },
    );
  if (claim.state === "busy")
    return Response.json(
      {
        error: "Your request is still processing. Please retry shortly.",
        code: "REQUEST_IN_PROGRESS",
      },
      { status: 409, headers: { "Retry-After": "3" } },
    );
  const { token, reference } = claim;
  const fail = async (message: string, status = 400) => {
    await releaseSubmission(key, token).catch(() => {});
    return error(message, status);
  };
  const emailHash = createHash("sha256")
    .update(parsed.data.email.toLowerCase())
    .digest("hex");
  if (
    !(await rateLimit(`public:${identity}`, 60, 600)) ||
    !(await rateLimit(`email:${emailHash}`, 5, 3600))
  )
    return fail("Too many requests", 429);
  const docs: {
    id: string;
    name: string;
    type: string;
    file: string;
    buffer: Buffer;
  }[] = [];
  class DocumentRejected extends Error {
    constructor(
      message: string,
      readonly status = 400,
    ) {
      super(message);
    }
  }
  try {
    docs.push(
      ...(await Promise.all(
        files.map(async (f) => {
          if (
            f.size >
              (process.env.BLIES_STORAGE_MODE === "supabase" ? 2 : 10) *
                1024 *
                1024 ||
            !allowedTypes.includes(f.type)
          )
            throw new DocumentRejected("Invalid file size or type");
          const buffer = Buffer.from(await f.arrayBuffer()),
            type = fileType(buffer);
          if (!type || type !== f.type)
            throw new DocumentRejected("File content does not match type");
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
            if (!scan.ok)
              throw new DocumentRejected("Document scanning unavailable", 503);
            if ((await scan.json()).clean !== true)
              throw new DocumentRejected(
                "Document rejected by malware scanner",
                422,
              );
          } catch (e) {
            if (e instanceof DocumentRejected) throw e;
            throw new DocumentRejected("Document scanning unavailable", 503);
          }
          const id = randomUUID();
          return {
            id,
            name: path.basename(f.name).slice(0, 200) || "document",
            type,
            file: id,
            buffer,
          };
        }),
      )),
    );
  } catch (e) {
    return fail(
      e instanceof DocumentRejected
        ? e.message
        : "Document scanning unavailable",
      e instanceof DocumentRejected ? e.status : 503,
    );
  }
  const written: string[] = [];
  try {
    if (
      process.env.BLIES_STORAGE_MODE === "supabase" &&
      docs.reduce((n, d) => n + d.buffer.length, 0) > 2 * 1024 * 1024
    )
      return fail("Combined files exceed 2 MB", 413);
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
    const receipt = await submitEnquiry(
      key,
      token,
      reference,
      kind,
      queue,
      parsed.data,
      docs.map((d) => ({ id: d.id, name: d.name, type: d.type, file: d.file })),
      customer?.id || null,
    );
    return Response.json(receipt, { status: 201 });
  } catch {
    // An HTTP timeout may follow a committed transaction. Check receipt before touching files.
    try {
      const resolution = await resolveSubmission(key, hash, token);
      if (resolution.state === "complete")
        return Response.json(resolution.response, { status: 201 });
      if (resolution.state !== "aborted")
        return error(
          "Storage outcome pending. Retry with the same details.",
          503,
        );
      await Promise.all(
        written.map((f) =>
          removeFile(f).catch(() =>
            console.warn("BLIES private file reconciliation needed"),
          ),
        ),
      );
    } catch {
      console.warn("BLIES submission reconciliation needed");
    }
    return error("Storage unavailable", 503);
  }
}
