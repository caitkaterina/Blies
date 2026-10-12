import { backendRequest } from "@/lib/backend";
import { z } from "zod";
import { authorise } from "@/lib/auth";
import { db, audit } from "@/lib/store";
import { sendConfirmation, sendReply } from "@/lib/enquiries";
import { type Locale } from "@/lib/i18n";
async function getHandler(req: Request) {
  if (!(await authorise(req, ["admin", "sales"])))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({
    records: db()
      .prepare("SELECT * FROM enquiries ORDER BY created DESC LIMIT 200")
      .all()
      .map((r) => ({
        ...r,
        data: JSON.parse(r.data as string),
        documents: db()
          .prepare("SELECT id,name,type FROM documents WHERE enquiry=?")
          .all(r.id as string),
      })),
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
  const row = db().prepare("SELECT data FROM enquiries WHERE id=?").get(v.id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (v.sendReply) {
    if (!v.reply.trim())
      return Response.json(
        { error: "Enter a response first" },
        { status: 422 },
      );
    const data = JSON.parse(row.data as string);
    const result = await sendReply(
      data.email,
      data.locale as Locale,
      v.id,
      v.reply,
    );
    if (result !== "sent")
      return Response.json(
        {
          error:
            result === "not-configured"
              ? "Email delivery is not configured"
              : "Email delivery is pending; retry with the same response",
        },
        { status: 503 },
      );
    v.status = "responded";
    audit(s.user, "enquiry.response-sent", v.id);
  }
  db()
    .prepare("UPDATE enquiries SET status=?,assigned=?,reply=? WHERE id=?")
    .run(v.status, v.assigned, v.reply, v.id);
  audit(s.user, "enquiry.updated", v.id);
  if (v.retryEmail) {
    const data = JSON.parse(row.data as string);
    const result = await sendConfirmation(
      data.email,
      data.locale as Locale,
      v.id,
    );
    db()
      .prepare("UPDATE enquiries SET email_status=? WHERE id=?")
      .run(result, v.id);
  }
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  return backendRequest(() => getHandler(request));
}

export async function POST(request: Request) {
  return backendRequest(() => postHandler(request));
}
