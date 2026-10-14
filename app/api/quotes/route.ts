import { backendRequest } from "@/lib/backend";
import { receive } from "@/lib/enquiries";
import { publicCors, publicOrigin } from "@/lib/security";
import { scheduleOutbox } from "@/lib/outbox-scheduler";
export const maxDuration = 60;
export const runtime = "nodejs";
export async function POST(request: Request) {
  const response = await backendRequest(() => receive(request, "quote"));
  if (response.status === 201) scheduleOutbox();
  return publicCors(request, response);
}
export async function OPTIONS(request: Request) {
  return publicCors(
    request,
    new Response(null, { status: publicOrigin(request) ? 204 : 403 }),
  );
}
