import "server-only";
import { randomUUID } from "node:crypto";
import {
  db,
  audit as sqliteAudit,
  rateLimit as sqliteLimit,
  published as sqlitePublished,
} from "./store";
import { rpc, supabaseRequest } from "./supabase-http";
import { enqueueLocal } from "./delivery-store";
import { createHash } from "node:crypto";
import type { ContentData } from "./cms-types";
export type Row = Record<string, unknown>;
export type DocumentRow = {
  id: string;
  name: string;
  type: string;
  file: string;
};
const remote = () => process.env.BLIES_STORAGE_MODE === "supabase";
export async function audit(actor: string, event: string, target: string) {
  if (!remote()) return sqliteAudit(actor, event, target);
  await rpc("blies_audit", {
    p_actor: actor,
    p_event: event,
    p_target: target,
  });
}
export async function rateLimit(
  key: string,
  max = 8,
  seconds = 600,
): Promise<boolean> {
  return remote()
    ? rpc("blies_rate_limit", { p_key: key, p_max: max, p_seconds: seconds })
    : sqliteLimit(key, max, seconds);
}
export async function createEnquiry(
  id: string,
  kind: string,
  queue: string,
  data: unknown,
  docs: DocumentRow[],
  customerId: string | null = null,
) {
  if (remote()) {
    await rpc("blies_create_enquiry", {
      p_id: id,
      p_kind: kind,
      p_queue: queue,
      p_data: data,
      p_documents: docs,
      p_customer_id: customerId,
    });
    return;
  }
  const d = db();
  d.exec("BEGIN");
  try {
    d.prepare(
      "INSERT INTO enquiries(id,kind,created,status,queue,email_status,data,customer_id) VALUES (?,?,?,?,?,?,?,?)",
    ).run(
      id,
      kind,
      new Date().toISOString(),
      "received",
      queue,
      "pending",
      JSON.stringify(data),
      customerId,
    );
    for (const doc of docs)
      d.prepare("INSERT INTO documents VALUES (?,?,?,?,?)").run(
        doc.id,
        id,
        doc.name,
        doc.type,
        doc.file,
      );
    sqliteAudit("public", `${kind}.received`, id);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export async function setEmailStatus(id: string, status: string) {
  if (remote()) {
    await rpc("blies_email_status", { p_id: id, p_status: status });
    return;
  }
  db()
    .prepare("UPDATE enquiries SET email_status=? WHERE id=?")
    .run(status, id);
}
export async function records(): Promise<Row[]> {
  if (remote())
    return await (
      await supabaseRequest(
        "/rest/v1/enquiries?select=*,documents(id,name,type)&order=created.desc&limit=200",
      )
    ).json();
  return db()
    .prepare("SELECT * FROM enquiries ORDER BY created DESC LIMIT 200")
    .all()
    .map((r) => ({
      ...r,
      data: JSON.parse(r.data as string),
      documents: db()
        .prepare("SELECT id,name,type FROM documents WHERE enquiry=?")
        .all(r.id as string)
        .map((d) => ({ ...d })),
    }));
}
export async function record(
  id: string,
): Promise<(Row & { data: Record<string, unknown> }) | undefined> {
  if (remote())
    return (
      await (
        await supabaseRequest(
          `/rest/v1/enquiries?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
        )
      ).json()
    )[0];
  const r = db().prepare("SELECT * FROM enquiries WHERE id=?").get(id);
  return r ? { ...r, data: JSON.parse(r.data as string) } : undefined;
}
export async function updateRecord(
  actor: string,
  v: { id: string; status: string; assigned: string; reply: string },
  notifyReply = false,
) {
  if (remote()) {
    await rpc("blies_update_record", {
      p_actor: actor,
      p_id: v.id,
      p_status: v.status,
      p_assigned: v.assigned,
      p_reply: v.reply,
      p_notify_reply: notifyReply,
    });
    return;
  }
  const d = db();
  d.exec("BEGIN");
  try {
    const previous = d
      .prepare("SELECT status,data FROM enquiries WHERE id=?")
      .get(v.id);
    if (!previous) throw Error("Record not found");
    const data = JSON.parse(String(previous.data));
    if (previous.status !== v.status)
      enqueueLocal(
        d,
        `status:${randomUUID()}`,
        data.email,
        data.locale,
        "BLIES — Request status update",
        `Your request ${v.id} is now ${v.status}.`,
        v.id,
      );
    if (notifyReply)
      enqueueLocal(
        d,
        `reply:${v.id}:${createHash("sha256").update(v.reply).digest("hex")}`,
        data.email,
        data.locale,
        "BLIES — Response to your request",
        v.reply,
        v.id,
      );
    d.prepare(
      "UPDATE enquiries SET status=?,assigned=?,reply=? WHERE id=?",
    ).run(v.status, v.assigned, v.reply, v.id);
    sqliteAudit(actor, "enquiry.updated", v.id);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export async function document(id: string): Promise<Row | undefined> {
  if (remote())
    return (
      await (
        await supabaseRequest(
          `/rest/v1/documents?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
        )
      ).json()
    )[0];
  return db().prepare("SELECT * FROM documents WHERE id=?").get(id);
}
export async function contentState(): Promise<{
  content: Row[];
  versions: Row[];
  audit: Row[];
}> {
  if (remote()) {
    const read = async (table: string, order: string, limit: string = "") =>
      await (
        await supabaseRequest(
          `/rest/v1/${table}?select=*&order=${order}${limit}`,
        )
      ).json();
    return {
      content: await read("content", "position,updated.desc"),
      versions: await read("versions", "created.desc", "&limit=100"),
      audit: await read("audit_records", "created.desc", "&limit=100"),
    };
  }
  return {
    content: db()
      .prepare("SELECT * FROM content ORDER BY position,updated DESC")
      .all()
      .map((r) => ({ ...r, data: JSON.parse(r.data as string) })),
    versions: db()
      .prepare("SELECT * FROM versions ORDER BY created DESC LIMIT 100")
      .all()
      .map((r) => ({ ...r })),
    audit: db()
      .prepare("SELECT * FROM audit ORDER BY created DESC LIMIT 100")
      .all()
      .map((r) => ({ ...r })),
  };
}
export async function saveContent(
  actor: string,
  v: {
    kind: string;
    slug: string;
    status: string;
    position: number;
    data: ContentData;
  },
  id: string,
) {
  if (remote()) {
    await rpc("blies_save_content", {
      p_actor: actor,
      p_id: id,
      p_kind: v.kind,
      p_slug: v.slug,
      p_status: v.status,
      p_position: v.position,
      p_data: v.data,
    });
    return;
  }
  const d = db(),
    now = new Date().toISOString();
  d.exec("BEGIN");
  try {
    const previous = d.prepare("SELECT * FROM content WHERE id=?").get(id);
    if (previous)
      d.prepare("INSERT INTO versions VALUES (?,?,?,?,?)").run(
        randomUUID(),
        id,
        JSON.stringify(previous),
        actor,
        now,
      );
    d.prepare(
      "INSERT INTO content VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,slug=excluded.slug,status=excluded.status,position=excluded.position,data=excluded.data,updated=excluded.updated",
    ).run(
      id,
      v.kind,
      v.slug,
      v.status,
      v.position,
      JSON.stringify(v.data),
      now,
    );
    sqliteAudit(actor, "content.saved", id);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export async function published(
  kind: string,
  slug?: string,
): Promise<
  {
    id: string;
    slug: string;
    kind: string;
    status: string;
    data: ContentData;
  }[]
> {
  if (!remote()) return sqlitePublished(kind, slug);
  return await (
    await supabaseRequest(
      `/rest/v1/content?select=*&status=eq.published&kind=eq.${encodeURIComponent(kind)}${slug ? `&slug=eq.${encodeURIComponent(slug)}` : ""}&order=position,updated.desc`,
    )
  ).json();
}
