import { authorise } from "@/lib/auth";
import { db, dataDir, audit } from "@/lib/store";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await authorise(req, ["admin", "sales"]);
  if (!s) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const row = db().prepare("SELECT * FROM documents WHERE id=?").get(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (!/^[a-f0-9-]{36}$/.test(row.file as string))
    return Response.json({ error: "Invalid storage entry" }, { status: 500 });
  try {
    const data = await readFile(
      path.join(dataDir, "documents", row.file as string),
    );
    audit(s.user, "document.download", id);
    return new Response(data, {
      headers: {
        "Content-Type": row.type as string,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name as string)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Document unavailable" }, { status: 503 });
  }
}
