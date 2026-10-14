import type { ContentData } from "./cms-types";
import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { requirePersistence, StorageUnavailable } from "./storage-policy";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
export const dataDir = process.env.BLIES_DATA_DIR || "/workspace/blies-private";
let instance: DatabaseSync | undefined;
export function db() {
  requirePersistence();
  if (process.env.BLIES_STORAGE_MODE === "supabase")
    throw new StorageUnavailable();
  if (!instance) {
    let connection: DatabaseSync | undefined;
    try {
      const { DatabaseSync } = process.getBuiltinModule(
        "node:sqlite",
      ) as typeof import("node:sqlite");
      mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      chmodSync(dataDir, 0o700);
      connection = new DatabaseSync(path.join(dataDir, "blies.sqlite"));
      chmodSync(path.join(dataDir, "blies.sqlite"), 0o600);
      connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS enquiries(id TEXT PRIMARY KEY, kind TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL, queue TEXT NOT NULL, email_status TEXT NOT NULL, data TEXT NOT NULL, assigned TEXT NOT NULL DEFAULT '', reply TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,enquiry TEXT NOT NULL REFERENCES enquiries(id),name TEXT NOT NULL,type TEXT NOT NULL,file TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,kind TEXT NOT NULL,slug TEXT NOT NULL,status TEXT NOT NULL,position INTEGER NOT NULL,data TEXT NOT NULL,updated TEXT NOT NULL, UNIQUE(kind,slug));
CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,content_id TEXT NOT NULL,data TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,event TEXT NOT NULL,target TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS shipments(id TEXT PRIMARY KEY,reference TEXT NOT NULL UNIQUE,customer_id TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shipment_events(id TEXT PRIMARY KEY,shipment TEXT NOT NULL REFERENCES shipments(id),status TEXT NOT NULL,location TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS shipments_customer ON shipments(customer_id,created DESC);
CREATE INDEX IF NOT EXISTS shipment_events_shipment ON shipment_events(shipment,created);
CREATE TABLE IF NOT EXISTS submission_keys(key TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,token TEXT NOT NULL,reference TEXT NOT NULL,response TEXT,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS email_outbox(id TEXT PRIMARY KEY,recipient TEXT NOT NULL,locale TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,reference TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,available INTEGER NOT NULL,lease INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,claim_token TEXT);`);
      const cols = connection.prepare("PRAGMA table_info(enquiries)").all();
      if (!cols.some((c) => c.name === "customer_id"))
        connection.exec("ALTER TABLE enquiries ADD COLUMN customer_id TEXT");
      if (
        !connection
          .prepare("PRAGMA table_info(email_outbox)")
          .all()
          .some((c) => c.name === "claim_token")
      )
        connection.exec("ALTER TABLE email_outbox ADD COLUMN claim_token TEXT");
      instance = connection;
    } catch {
      try {
        connection?.close();
      } catch {}
      throw new StorageUnavailable();
    }
  }
  return instance;
}
export function audit(actor: string, event: string, target: string) {
  db()
    .prepare("INSERT INTO audit VALUES (?,?,?,?,?)")
    .run(randomUUID(), actor, event, target, new Date().toISOString());
}
export function rateLimit(key: string, max = 8, seconds = 600) {
  const now = Date.now();
  const d = db();
  d.prepare("DELETE FROM limits WHERE expires < ?").run(now);
  d.prepare(
    "INSERT INTO limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).run(key, now + seconds * 1000);
  const row = d.prepare("SELECT count FROM limits WHERE key=?").get(key) as {
    count: number;
  };
  return row.count <= max;
}
export function published(kind: string, slug?: string) {
  return db()
    .prepare(
      `SELECT * FROM content WHERE kind=? AND status='published' ${slug ? "AND slug=?" : ""} ORDER BY position,updated DESC`,
    )
    .all(...(slug ? [kind, slug] : [kind]))
    .map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      kind: String(r.kind),
      status: String(r.status),
      position: Number(r.position),
      data: JSON.parse(r.data as string) as ContentData,
    }));
}
