import { backendRequest } from "@/lib/backend";
import { receive } from "@/lib/enquiries";
import { publicCors, publicOrigin } from "@/lib/security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return publicCors(
    request,
    await backendRequest(() => receive(request, "quote")),
  );
}
export async function OPTIONS(request: Request) {
  return publicCors(
    request,
    new Response(null, { status: publicOrigin(request) ? 204 : 403 }),
  );
}
