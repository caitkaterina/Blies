import { authorise } from "@/lib/auth";
import { backendRequest } from "@/lib/backend";
import { contentState } from "@/lib/persistence";

export async function GET(request: Request) {
  return backendRequest(async () => {
    if (!(await authorise(request, ["admin"])))
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const { audit } = await contentState();
    // Return action metadata only; enquiry payloads and document paths are private.
    return Response.json(
      {
        audit: audit.map(({ id, created, actor, event, target }) => ({
          id,
          created,
          actor,
          event,
          target,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
