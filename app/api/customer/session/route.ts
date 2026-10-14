import { customerIdentity } from "@/lib/customer-auth";
import { customerResponse } from "../response";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return customerResponse(async () =>
    Response.json({ user: await customerIdentity(req) }),
  );
}
