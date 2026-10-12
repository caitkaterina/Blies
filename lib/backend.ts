import "server-only";
import { StorageUnavailable } from "./storage-policy";
export function backendUnavailable() {
  return Response.json(
    {
      error:
        "Persistent backend services are unavailable. No request has been accepted.",
      code: "BACKEND_UNAVAILABLE",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
export async function backendRequest(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof StorageUnavailable) return backendUnavailable();
    throw error;
  }
}
