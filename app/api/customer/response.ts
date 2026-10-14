import { backendRequest } from "@/lib/backend";
import { CustomerAuthError } from "@/lib/customer-auth";
export async function customerResponse(operation: () => Promise<Response>) {
  const response = await backendRequest(async () => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof CustomerAuthError)
        return Response.json(
          { error: error.message },
          { status: error.status },
        );
      throw error;
    }
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
