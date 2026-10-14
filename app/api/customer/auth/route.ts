import {
  customerAuthAction,
  customerMutationAllowed,
  CustomerAuthError,
} from "@/lib/customer-auth";
import { boundedBody, BodyTooLarge } from "@/lib/request-body";
import { rateLimit } from "@/lib/persistence";
import { customerResponse } from "../response";
export const runtime = "nodejs";
export async function POST(req: Request) {
  return customerResponse(async () => {
    if (!customerMutationAllowed(req))
      throw new CustomerAuthError(403, "Forbidden");
    let data: Record<string, unknown>;
    try {
      const body = await boundedBody(req, 4096);
      data = JSON.parse(new TextDecoder().decode(body));
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw Error();
    } catch (error) {
      throw new CustomerAuthError(
        error instanceof BodyTooLarge ? 413 : 400,
        "Invalid request",
      );
    }
    return customerAuthAction(req, data, rateLimit);
  });
}
