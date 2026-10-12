import "server-only";
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = process.env.BLIES_SITE_URL
      ? new URL(process.env.BLIES_SITE_URL).origin
      : `${new URL(req.url).protocol}//${req.headers.get("host") || new URL(req.url).host}`;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}
