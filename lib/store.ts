import type { ContentData } from "./cms-types";
import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
export const dataDir = process.env.BLIES_DATA_DIR || "/workspace/blies-private";
let instance: DatabaseSync | undefined;
export function db() {
  if (!instance) {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    chmodSync(dataDir, 0o700);
    instance = new DatabaseSync(path.join(dataDir, "blies.sqlite"));
    chmodSync(path.join(dataDir, "blies.sqlite"), 0o600);
    instance.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS enquiries(id TEXT PRIMARY KEY, kind TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL, queue TEXT NOT NULL, email_status TEXT NOT NULL, data TEXT NOT NULL, assigned TEXT NOT NULL DEFAULT '', reply TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,enquiry TEXT NOT NULL REFERENCES enquiries(id),name TEXT NOT NULL,type TEXT NOT NULL,file TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,kind TEXT NOT NULL,slug TEXT NOT NULL,status TEXT NOT NULL,position INTEGER NOT NULL,data TEXT NOT NULL,updated TEXT NOT NULL, UNIQUE(kind,slug));
CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,content_id TEXT NOT NULL,data TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,event TEXT NOT NULL,target TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
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
