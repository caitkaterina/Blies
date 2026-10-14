import "server-only";
import { randomUUID } from "node:crypto";
import { db, audit } from "./store";
import { rpc } from "./supabase-http";
import type { DocumentRow } from "./persistence";
export type Receipt = {
  reference: string;
  received: true;
  emailStatus: string;
};
export type Claim =
  | { state: "claimed"; token: string; reference: string }
  | { state: "complete"; response: Receipt }
  | { state: "conflict" }
  | { state: "busy" };
const remote = () => process.env.BLIES_STORAGE_MODE === "supabase";
export async function claimSubmission(
  key: string,
  hash: string,
  reference: string,
): Promise<Claim> {
  const token = randomUUID();
  if (remote())
    return rpc("blies_claim_submission", {
      p_key: key,
      p_hash: hash,
      p_token: token,
      p_reference: reference,
    });
  const d = db(),
    now = Date.now();
  d.exec("BEGIN IMMEDIATE");
  try {
    const row = d.prepare("SELECT * FROM submission_keys WHERE key=?").get(key);
    let result: Claim;
    if (row && row.payload_hash !== hash) result = { state: "conflict" };
    else if (row?.response)
      result = {
        state: "complete",
        response: JSON.parse(String(row.response)),
      };
    else if (row && Number(row.expires) > now) result = { state: "busy" };
    else {
      const ref = String(row?.reference || reference);
      d.prepare(
        "INSERT INTO submission_keys VALUES (?,?,?,?,NULL,?) ON CONFLICT(key) DO UPDATE SET token=excluded.token,expires=excluded.expires",
      ).run(key, hash, token, ref, now + 180000);
      result = { state: "claimed", token, reference: ref };
    }
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export async function submissionReceipt(
  key: string,
  hash: string,
): Promise<Receipt | null> {
  if (remote())
    return rpc("blies_submission_receipt", { p_key: key, p_hash: hash });
  const row = db()
    .prepare(
      "SELECT response FROM submission_keys WHERE key=? AND payload_hash=?",
    )
    .get(key, hash);
  return row?.response ? JSON.parse(String(row.response)) : null;
}
export async function releaseSubmission(key: string, token: string) {
  if (remote()) {
    await rpc("blies_release_submission", { p_key: key, p_token: token });
    return;
  }
  db()
    .prepare(
      "DELETE FROM submission_keys WHERE key=? AND token=? AND response IS NULL",
    )
    .run(key, token);
}
export async function submitEnquiry(
  key: string,
  token: string,
  id: string,
  kind: string,
  queue: string,
  data: Record<string, unknown>,
  docs: DocumentRow[],
  customerId: string | null,
): Promise<Receipt> {
  const receipt: Receipt = {
    reference: id,
    received: true,
    emailStatus:
      process.env.BLIES_EMAIL_API_KEY && process.env.BLIES_EMAIL_FROM
        ? "pending"
        : "not-configured",
  };
  const adminEmail = process.env.BLIES_ADMIN_NOTIFY_EMAIL || null;
  if (remote()) {
    return await rpc("blies_submit_enquiry", {
      p_key: key,
      p_token: token,
      p_id: id,
      p_kind: kind,
      p_queue: queue,
      p_data: data,
      p_documents: docs,
      p_customer_id: customerId,
      p_admin_email: adminEmail,
      p_email_configured: !!(
        process.env.BLIES_EMAIL_API_KEY && process.env.BLIES_EMAIL_FROM
      ),
    });
  }
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const row = d
      .prepare("SELECT token,response FROM submission_keys WHERE key=?")
      .get(key);
    if (!row || row.token !== token || row.response)
      throw Error("Submission lease expired");
    d.prepare(
      "INSERT INTO enquiries(id,kind,created,status,queue,email_status,data,customer_id) VALUES (?,?,?,?,?,?,?,?)",
    ).run(
      id,
      kind,
      new Date().toISOString(),
      "received",
      queue,
      receipt.emailStatus,
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
    audit("public", `${kind}.received`, id);
    enqueueLocal(
      d,
      `receipt:${id}`,
      String(data.email),
      String(data.locale),
      "BLIES — Request received",
      `Your ${kind} request has been received. Reference: ${id}. The team will review your request.`,
      id,
    );
    if (adminEmail)
      enqueueLocal(
        d,
        `admin:${id}`,
        adminEmail,
        "en",
        "BLIES — New request",
        `A new ${kind} request is available in administration. Reference: ${id}.`,
        id,
      );
    d.prepare(
      "UPDATE submission_keys SET response=? WHERE key=? AND token=?",
    ).run(JSON.stringify(receipt), key, token);
    d.exec("COMMIT");
    return receipt;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function enqueueLocal(
  d: ReturnType<typeof db>,
  id: string,
  to: string,
  locale: string,
  subject: string,
  message: string,
  reference: string,
) {
  const now = Date.now();
  d.prepare(
    "INSERT OR IGNORE INTO email_outbox(id,recipient,locale,subject,message,reference,available,created) VALUES (?,?,?,?,?,?,?,?)",
  ).run(id, to, locale, subject, message, reference, now, now);
}

export async function resolveSubmission(
  key: string,
  hash: string,
  token: string,
): Promise<
  { state: "aborted" | "unknown" } | { state: "complete"; response: Receipt }
> {
  if (remote())
    return rpc("blies_resolve_submission", {
      p_key: key,
      p_hash: hash,
      p_token: token,
    });
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const row = d.prepare("SELECT * FROM submission_keys WHERE key=?").get(key);
    let result:
      | { state: "aborted" | "unknown" }
      | { state: "complete"; response: Receipt };
    if (!row) result = { state: "aborted" };
    else if (row.payload_hash !== hash) result = { state: "unknown" };
    else if (row.response)
      result = {
        state: "complete",
        response: JSON.parse(String(row.response)),
      };
    else if (row.token !== token) result = { state: "unknown" };
    else {
      d.prepare("DELETE FROM submission_keys WHERE key=?").run(key);
      result = { state: "aborted" };
    }
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export async function retryConfirmation(
  id: string,
  data: Record<string, unknown>,
): Promise<"sent" | "pending" | "expired"> {
  if (remote()) return rpc("blies_retry_confirmation", { p_id: id });
  const d = db();
  enqueueLocal(
    d,
    `receipt:${id}`,
    String(data.email),
    String(data.locale),
    "BLIES — Request received",
    `Your request has been received. Reference: ${id}. The team will review your request.`,
    id,
  );
  const row = d
    .prepare("SELECT state,created FROM email_outbox WHERE id=?")
    .get(`receipt:${id}`)!;
  if (row.state === "sent") return "sent";
  if (Number(row.created) < Date.now() - 23 * 3600000) return "expired";
  d.prepare(
    "UPDATE email_outbox SET state='pending',attempts=0,available=? WHERE id=? AND state<>'processing'",
  ).run(Date.now(), `receipt:${id}`);
  return "pending";
}
