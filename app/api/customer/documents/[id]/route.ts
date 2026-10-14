import { customerIdentity, CustomerAuthError } from "@/lib/customer-auth";
import { canAccessDocument } from "@/lib/customer-store";
import { fileDownload } from "@/lib/private-files";
import { audit } from "@/lib/persistence";
import { StorageUnavailable } from "@/lib/storage-policy";
import { customerResponse } from "../../response";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return customerResponse(async () => {
    const user = await customerIdentity(req);
    if (!user) throw new CustomerAuthError(401, "Sign in required");
    const { id } = await params;
    const document = await canAccessDocument(user.id, id);
    if (!document) throw new CustomerAuthError(404, "Not found");
    let data: Buffer | string;
    try {
      data = await fileDownload(document.file);
    } catch {
      throw new StorageUnavailable();
    }
    await audit(user.id, "customer.document.download", id);
    if (new URL(req.url).searchParams.get("format") === "json")
      return Response.json({
        url:
          typeof data === "string"
            ? data
            : `/api/customer/documents/${encodeURIComponent(id)}`,
      });
    if (typeof data === "string")
      return new Response(null, { status: 302, headers: { Location: data } });
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": document.type,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
