import { persistentStorageEnabled } from "@/lib/storage-policy";
export async function GET() {
  return Response.json(
    {
      service: "blies-api",
      configured: persistentStorageEnabled(),
      customerAuthConfigured: !!(
        process.env.BLIES_SUPABASE_URL && process.env.BLIES_SUPABASE_ANON_KEY
      ),
      uploadsConfigured: !!(
        process.env.BLIES_SCAN_URL && process.env.BLIES_SCAN_KEY
      ),
      emailConfigured: !!(
        process.env.BLIES_EMAIL_API_KEY && process.env.BLIES_EMAIL_FROM
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
