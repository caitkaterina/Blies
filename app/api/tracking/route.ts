import { backendRequest } from "@/lib/backend";
import { receive } from "@/lib/enquiries";
export const runtime = "nodejs";
async function postHandler(request: Request) {
  return receive(request, "tracking");
}

export async function POST(request: Request) {
  return backendRequest(() => postHandler(request));
}
