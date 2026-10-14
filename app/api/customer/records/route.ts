import { customerIdentity, CustomerAuthError } from "@/lib/customer-auth";
import { customerRecords } from "@/lib/customer-store";
import { customerResponse } from "../response";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return customerResponse(async () => {
    const user = await customerIdentity(req);
    if (!user) throw new CustomerAuthError(401, "Sign in required");
    return Response.json({ records: await customerRecords(user.id) });
  });
}
