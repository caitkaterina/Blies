import { receive } from "@/lib/enquiries";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return receive(request, "tracking");
}
