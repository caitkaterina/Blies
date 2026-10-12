import { cookies } from "next/headers";
import { authorise } from "@/lib/auth";
export async function POST(req: Request) {
  if (!(await authorise(req, ["admin", "editor", "sales"], true)))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  (await cookies()).delete("blies_admin");
  return Response.json({ ok: true });
}
