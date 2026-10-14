import { authorise } from "@/lib/auth";
import { backendRequest } from "@/lib/backend";
import { drainOutbox } from "@/lib/notifications";
import { audit } from "@/lib/persistence";

export async function POST(request: Request) {
  return backendRequest(async () => {
    const staff = await authorise(request, ["admin"], true);
    if (!staff) return Response.json({ error: "Forbidden" }, { status: 403 });
    const delivery = await drainOutbox(10);
    await audit(staff.user, "notification.retry", "outbox");
    return Response.json(
      { ok: true, delivery },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
