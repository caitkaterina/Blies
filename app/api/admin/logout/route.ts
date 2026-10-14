import { cookies } from "next/headers";
import { authorise } from "@/lib/auth";
import { audit } from "@/lib/persistence";
import { backendRequest } from "@/lib/backend";
export async function POST(req: Request) {
  return backendRequest(async () => {
    const staff = await authorise(req, ["admin", "editor", "sales"], true);
    if (!staff) return Response.json({ error: "Forbidden" }, { status: 403 });
    (await cookies()).delete("blies_admin");
    await audit(staff.user, "auth.logout", "admin");
    return Response.json({ ok: true });
  });
}
