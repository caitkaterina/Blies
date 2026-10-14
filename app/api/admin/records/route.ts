import { backendRequest } from "@/lib/backend";
import { scheduleOutbox } from "@/lib/outbox-scheduler";
export const maxDuration = 60;
import { retryConfirmation } from "@/lib/delivery-store";
import { z } from "zod";
import { authorise } from "@/lib/auth";
import { records, record, updateRecord } from "@/lib/persistence";
async function getHandler(req: Request) {
  if (!(await authorise(req, ["admin", "sales"])))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({
    records: await records(),
  });
}
async function postHandler(req: Request) {
  const s = await authorise(req, ["admin", "sales"], true);
  if (!s) return Response.json({ error: "Forbidden" }, { status: 403 });
  let raw;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = z
    .object({
      id: z.string().max(100),
      status: z.enum(["received", "in-review", "responded", "closed"]),
      assigned: z.string().max(200),
      reply: z.string().max(10000),
      retryEmail: z.boolean().optional(),
      sendReply: z.boolean().optional(),
    })
    .safeParse(raw);
  if (!parsed.success)
    return Response.json({ error: "Invalid record" }, { status: 422 });
  const v = parsed.data;
  const row = await record(v.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (v.sendReply && !v.reply.trim())
    return Response.json({ error: "Enter a response first" }, { status: 422 });
  if (v.sendReply) v.status = "responded";
  await updateRecord(s.user, v, !!v.sendReply);
  scheduleOutbox();
  if (v.retryEmail) {
    const retry = await retryConfirmation(v.id, row.data);
    if (retry === "expired")
      return Response.json(
        {
          error:
            "Delivery retry window expired. Review the provider outcome before resending.",
        },
        { status: 409 },
      );
    if (retry === "sent")
      return Response.json({ ok: true, notificationStatus: "sent" });
  }
  // Delivery runs independently; a queued notification is not a sent message.
  return Response.json({
    ok: true,
    notificationStatus:
      process.env.BLIES_EMAIL_API_KEY && process.env.BLIES_EMAIL_FROM
        ? "pending"
        : "not-configured",
  });
}

export async function GET(request: Request) {
  return backendRequest(() => getHandler(request));
}

export async function POST(request: Request) {
  return backendRequest(() => postHandler(request));
}
