import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./store";
import { rpc } from "./supabase-http";
import { brandedEmail } from "./email-template";
import { setEmailStatus } from "./persistence";
type Job = {
  id: string;
  recipient: string;
  locale: string;
  subject: string;
  message: string;
  reference: string;
  attempts: number;
  claim_token: string;
};
export async function drainOutbox(
  limit = 10,
): Promise<{ sent: number; pending: number; notConfigured: boolean }> {
  if (!process.env.BLIES_EMAIL_API_KEY || !process.env.BLIES_EMAIL_FROM)
    return { sent: 0, pending: 0, notConfigured: true };
  limit = Math.max(1, Math.min(10, limit));
  let jobs: Job[];
  if (process.env.BLIES_STORAGE_MODE === "supabase")
    jobs = await rpc("blies_claim_emails", { p_limit: limit });
  else {
    const d = db(),
      now = Date.now();
    d.exec("BEGIN IMMEDIATE");
    try {
      jobs = d
        .prepare(
          "SELECT * FROM email_outbox WHERE ((state='pending' AND available<=?) OR (state='processing' AND lease<?)) AND attempts<8 AND created>? ORDER BY created LIMIT ?",
        )
        .all(now, now, now - 23 * 3600000, limit)
        .map((r) => ({ ...r })) as Job[];
      for (const job of jobs) {
        job.claim_token = randomUUID();
        job.attempts++;
        d.prepare(
          "UPDATE email_outbox SET state='processing',attempts=attempts+1,lease=?,claim_token=? WHERE id=?",
        ).run(now + 300000, job.claim_token, job.id);
      }
      d.exec("COMMIT");
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
  }
  let sent = 0,
    pending = 0;
  await Promise.all(
    jobs.map(async (job) => {
      let ok = false;
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.BLIES_EMAIL_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `blies-outbox-${job.id}`,
          },
          body: JSON.stringify({
            from: process.env.BLIES_EMAIL_FROM,
            to: [job.recipient],
            subject: job.subject,
            text: job.message,
            html: brandedEmail(job.message, job.reference),
          }),
          signal: AbortSignal.timeout(10000),
        });
        ok = r.ok;
      } catch {
        ok = false;
      }
      if (process.env.BLIES_STORAGE_MODE === "supabase")
        await rpc("blies_finish_email", {
          p_id: job.id,
          p_sent: ok,
          p_token: job.claim_token,
        });
      else {
        const attempts = job.attempts;
        db()
          .prepare(
            "UPDATE email_outbox SET state=?,available=?,lease=0 WHERE id=? AND claim_token=?",
          )
          .run(
            ok ? "sent" : attempts >= 8 ? "failed" : "pending",
            Date.now() + Math.min(3600000, 60000 * 2 ** (job.attempts - 1)),
            job.id,
            job.claim_token,
          );
      }
      if (ok) {
        sent++;
        if (job.id.startsWith("receipt:"))
          await setEmailStatus(job.reference, "sent").catch(() =>
            console.warn("BLIES email state reconciliation needed"),
          );
      } else pending++;
    }),
  );
  return { sent, pending, notConfigured: false };
}
