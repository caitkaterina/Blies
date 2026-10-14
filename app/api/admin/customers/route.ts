import { authorise } from "@/lib/auth";
import { backendRequest } from "@/lib/backend";
import { supabaseRequest } from "@/lib/supabase-http";
import { StorageUnavailable } from "@/lib/storage-policy";

export async function GET(request: Request) {
  return backendRequest(async () => {
    if (!(await authorise(request, ["admin", "sales"])))
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const pageText = new URL(request.url).searchParams.get("page") ?? "1";
    if (!/^[1-9]\d{0,3}$/.test(pageText) || Number(pageText) > 1000)
      return Response.json({ error: "Invalid customer page" }, { status: 400 });
    if (process.env.BLIES_STORAGE_MODE !== "supabase")
      return Response.json(
        { customers: [], configured: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    const data = await (
      await supabaseRequest(
        `/auth/v1/admin/users?page=${Number(pageText)}&per_page=50`,
      )
    ).json();
    if (!Array.isArray(data.users)) throw new StorageUnavailable();
    const users: unknown[] = data.users;
    const customers = users.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const user = raw as Record<string, unknown>;
      if (typeof user.id !== "string" || typeof user.email !== "string")
        return [];
      const metadata =
        user.user_metadata && typeof user.user_metadata === "object"
          ? (user.user_metadata as Record<string, unknown>)
          : {};
      return [
        {
          id: user.id,
          email: user.email,
          name: typeof metadata.name === "string" ? metadata.name : "",
          confirmed:
            typeof user.email_confirmed_at === "string" &&
            !!user.email_confirmed_at,
        },
      ];
    });
    return Response.json(
      { customers, configured: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
