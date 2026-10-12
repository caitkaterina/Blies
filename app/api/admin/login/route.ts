import { sameOrigin } from "@/lib/security";
import { cookies } from "next/headers";
import { authReady, checkLogin, newSession, signSession } from "@/lib/auth";
import { rateLimit, audit } from "@/lib/store";
export async function POST(req: Request) {
  if (!authReady())
    return Response.json(
      { error: "Administrator authentication is not configured" },
      { status: 503 },
    );
  if (!sameOrigin(req))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit("admin-login", 5, 300))
    return Response.json({ error: "Try again later" }, { status: 429 });
  let data;
  try {
    const body = await req.text();
    if (body.length > 4096) throw Error();
    data = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    typeof data.email !== "string" ||
    typeof data.password !== "string" ||
    typeof data.code !== "string" ||
    !checkLogin(data.email, data.password, data.code)
  ) {
    audit("anonymous", "auth.failed", "admin");
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!rateLimit(`totp:${data.email}:${data.code}`, 1, 90))
    return Response.json(
      { error: "Authenticator code already used" },
      { status: 401 },
    );
  const s = newSession(data.email);
  (await cookies()).set("blies_admin", signSession(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600,
    path: "/",
  });
  audit(s.user, "auth.login", "admin");
  return Response.json({ ok: true });
}
