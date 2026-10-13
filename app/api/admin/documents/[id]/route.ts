import { backendRequest } from "@/lib/backend";
import { authorise } from "@/lib/auth";
import { document, audit } from "@/lib/persistence";
import { fileDownload } from "@/lib/private-files";
async function getHandler(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await authorise(req, ["admin", "sales"]);
  if (!s) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const row = await document(id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (!/^[a-f0-9-]{36}$/.test(row.file as string))
    return Response.json({ error: "Invalid storage entry" }, { status: 500 });
  try {
    const data = await fileDownload(row.file as string);
    await audit(s.user, "document.download", id);
    if (typeof data === "string")
      return new Response(null, {
        status: 302,
        headers: {
          Location: data,
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    return new Response(new Uint8Array(data), {
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

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  return backendRequest(() => getHandler(req, context));
}
