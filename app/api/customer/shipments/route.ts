import { customerIdentity, CustomerAuthError } from "@/lib/customer-auth";
import { customerShipments } from "@/lib/customer-store";
import { customerResponse } from "../response";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return customerResponse(async () => {
    const user = await customerIdentity(req);
    if (!user) throw new CustomerAuthError(401, "Sign in required");
    const reference = new URL(req.url).searchParams.get("reference");
    if (reference !== null && (!reference.trim() || reference.length > 100))
      throw new CustomerAuthError(400, "Invalid reference");
    return Response.json({
      shipments: await customerShipments(user.id, reference?.trim()),
    });
  });
}
