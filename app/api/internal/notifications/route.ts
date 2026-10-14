import { timingSafeEqual } from "node:crypto";
import { backendRequest } from "@/lib/backend";
import { drainOutbox } from "@/lib/notifications";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  const configured = process.env.CRON_SECRET;
  const supplied = req.headers.get("authorization") || "";
  const expected = `Bearer ${configured}`;
  if (
    !configured ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return Response.json({ error: "Forbidden" }, { status: 403 });
  return backendRequest(async () =>
    Response.json(await drainOutbox(5), {
      headers: { "Cache-Control": "no-store" },
    }),
  );
}
