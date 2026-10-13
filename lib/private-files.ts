import "server-only";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./store";
import { supabaseRequest } from "./supabase-http";
const bucket = "blies-private";
const safe = (key: string) => {
  if (!/^[a-f0-9-]{36}$/.test(key)) throw Error("Invalid storage entry");
  return key;
};
export async function putFile(key: string, type: string, bytes: Buffer) {
  safe(key);
  if (process.env.BLIES_STORAGE_MODE === "supabase") {
    await supabaseRequest(`/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: { "Content-Type": type, "x-upsert": "false" },
      body: new Uint8Array(bytes),
    });
    return;
  }
  await mkdir(path.join(dataDir, "documents"), {
    recursive: true,
    mode: 0o700,
  });
  await writeFile(path.join(dataDir, "documents", key), bytes, {
    flag: "wx",
    mode: 0o600,
  });
}
export async function removeFile(key: string) {
  safe(key);
  if (process.env.BLIES_STORAGE_MODE === "supabase") {
    await supabaseRequest(`/storage/v1/object/${bucket}`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes: [key] }),
    });
    return;
  }
  await unlink(path.join(dataDir, "documents", key));
}
export async function fileDownload(key: string): Promise<Buffer | string> {
  safe(key);
  if (process.env.BLIES_STORAGE_MODE === "supabase") {
    const r = await supabaseRequest(
      `/storage/v1/object/sign/${bucket}/${key}`,
      {
        method: "POST",
        body: JSON.stringify({ expiresIn: 60, download: true }),
      },
    );
    const data = await r.json();
    if (
      typeof data.signedURL !== "string" ||
      !data.signedURL.startsWith("/object/sign/")
    )
      throw Error("Invalid signed URL");
    return `${process.env.BLIES_SUPABASE_URL}/storage/v1${data.signedURL}`;
  }
  return readFile(path.join(dataDir, "documents", key));
}
