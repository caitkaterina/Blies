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

export function publicOrigin(req: Request) {
  if (sameOrigin(req)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return (process.env.BLIES_PUBLIC_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(origin);
}
export function publicCors(req: Request, response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Origin");
  if (publicOrigin(req)) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      req.headers.get("origin")!,
    );
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return response;
}
