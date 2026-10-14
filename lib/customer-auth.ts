import { createHash } from "node:crypto";
import { StorageUnavailable } from "./storage-policy.ts";
import { publicOrigin } from "./security.ts";

export type CustomerIdentity = { id: string; email: string; name: string };
type ProviderUser = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
  user_metadata?: { name?: unknown };
};
type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
export class CustomerAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "CustomerAuthError";
  }
}
export const customerCookies = {
  access: "blies_customer_access",
  refresh: "blies_customer_refresh",
} as const;
export function customerCookie(req: Request, name: string) {
  const match = (req.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  const value = match.slice(name.length + 1);
  return value.length <= 8192 && /^[A-Za-z0-9._~-]+$/.test(value)
    ? value
    : null;
}
function providerConfig() {
  const url = process.env.BLIES_SUPABASE_URL;
  const key = process.env.BLIES_SUPABASE_ANON_KEY;
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key)
    throw new StorageUnavailable();
  return { url, key };
}
function customerCallback() {
  const site = process.env.BLIES_CUSTOMER_SITE_URL;
  if (!site) throw new StorageUnavailable();
  try {
    const origin = new URL(site).origin;
    const allowed = (process.env.BLIES_PUBLIC_ORIGINS || "")
      .split(",")
      .map((value) => value.trim());
    if (
      site !== origin ||
      !allowed.includes(origin) ||
      (!origin.startsWith("https://") &&
        !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    )
      throw Error();
    // Figma's frontend uses hash routing. Email templates append token_hash before
    // #/en/account; an implicit token fragment would overwrite that route.
    return `${origin}/`;
  } catch {
    throw new StorageUnavailable();
  }
}
export async function customerProvider(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<Record<string, unknown>> {
  const { url, key } = providerConfig();
  let response: Response;
  try {
    response = await fetch(`${url}/auth/v1${path}`, {
      ...init,
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new StorageUnavailable();
  }
  if (response.status >= 500) throw new StorageUnavailable();
  if (!response.ok) {
    if (response.status === 429)
      throw new CustomerAuthError(429, "Try again later");
    // Provider details can expose account existence or configuration; never forward them.
    throw new CustomerAuthError(401, "Authentication failed");
  }
  if (response.status === 204 || response.headers.get("content-length") === "0")
    return {};
  try {
    const body = await response.text();
    return body ? (JSON.parse(body) as Record<string, unknown>) : {};
  } catch {
    throw new StorageUnavailable();
  }
}
function identity(user: ProviderUser): CustomerIdentity | null {
  if (
    typeof user.id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      user.id,
    ) ||
    typeof user.email !== "string" ||
    typeof user.email_confirmed_at !== "string" ||
    !user.email_confirmed_at
  )
    return null;
  return {
    id: user.id,
    email: user.email,
    name:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.slice(0, 200)
        : "",
  };
}
export async function customerIdentity(
  req: Request,
): Promise<CustomerIdentity | null> {
  const token = customerCookie(req, customerCookies.access);
  if (!token) return null;
  try {
    return identity(await customerProvider("/user", {}, token));
  } catch (error) {
    if (error instanceof CustomerAuthError && error.status === 401) return null;
    throw error;
  }
}
export function customerMutationAllowed(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || req.headers.get("x-blies-csrf") !== "1") return false;
  try {
    // Only exact serialized origins; reject paths, credentials and suffix matches.
    return new URL(origin).origin === origin && publicOrigin(req);
  } catch {
    return false;
  }
}
function setSession(response: Response, tokens: Tokens | null) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  for (const [name, value, age] of [
    [
      customerCookies.access,
      tokens?.access_token || "",
      tokens ? Math.max(1, Math.min(tokens.expires_in, 3600)) : 0,
    ],
    [
      customerCookies.refresh,
      tokens?.refresh_token || "",
      tokens ? 30 * 86400 : 0,
    ],
  ] as const)
    response.headers.append(
      "Set-Cookie",
      `${name}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`,
    );
  return response;
}
async function authenticatedResponse(data: Record<string, unknown>) {
  if (
    typeof data.access_token !== "string" ||
    typeof data.refresh_token !== "string" ||
    !/^[A-Za-z0-9._~-]+$/.test(data.access_token) ||
    !/^[A-Za-z0-9._~-]+$/.test(data.refresh_token) ||
    data.access_token.length > 8192 ||
    data.refresh_token.length > 8192 ||
    typeof data.expires_in !== "number" ||
    !Number.isFinite(data.expires_in)
  )
    throw new CustomerAuthError(401, "Authentication failed");
  const user = identity(await customerProvider("/user", {}, data.access_token));
  if (!user)
    throw new CustomerAuthError(401, "Confirm your email before signing in");
  return setSession(Response.json({ user }), data as Tokens);
}
const emailValid = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const passwordValid = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 12 && value.length <= 128;
export async function customerAuthAction(
  req: Request,
  data: Record<string, unknown>,
  limit: (key: string, max: number, seconds: number) => Promise<boolean>,
) {
  if (!customerMutationAllowed(req))
    throw new CustomerAuthError(403, "Forbidden");
  providerConfig();
  const action = data.action;
  if (
    ![
      "register",
      "login",
      "logout",
      "recover",
      "verify",
      "refresh",
      "password",
      "profile",
    ].includes(String(action))
  )
    throw new CustomerAuthError(400, "Invalid request");
  // Shared and account limits are durable in the selected persistence adapter.
  const scope = createHash("sha256")
    .update(
      typeof data.email === "string"
        ? data.email.toLowerCase()
        : customerCookie(req, customerCookies.access) || "anonymous",
    )
    .digest("hex");
  if (
    !(await limit(`customer-auth:${action}`, 50, 600)) ||
    !(await limit(`customer-auth:${action}:${scope}`, 8, 600))
  )
    throw new CustomerAuthError(429, "Try again later");
  if (action === "register" || action === "login" || action === "recover") {
    if (!emailValid(data.email))
      throw new CustomerAuthError(422, "Enter a valid email address");
    if (action === "register" && !passwordValid(data.password))
      throw new CustomerAuthError(
        422,
        "Use a password of 12 to 128 characters",
      );
    if (
      action === "login" &&
      (typeof data.password !== "string" ||
        !data.password ||
        data.password.length > 128)
    )
      throw new CustomerAuthError(422, "Enter your password");
  }
  if (action === "register") {
    if (
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.length > 200
    )
      throw new CustomerAuthError(422, "Enter your name");
    try {
      await customerProvider(
        `/signup?redirect_to=${encodeURIComponent(customerCallback())}`,
        {
          method: "POST",
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            data: { name: data.name.trim() },
          }),
        },
      );
    } catch (error) {
      if (!(error instanceof CustomerAuthError) || error.status === 429)
        throw error;
    }
    // Never establish a session from signup: verification is required, even if project settings disable it.
    return Response.json({
      ok: true,
      message:
        "If registration is available, check your email to confirm your account.",
    });
  }
  if (action === "recover") {
    try {
      await customerProvider(
        `/recover?redirect_to=${encodeURIComponent(customerCallback())}`,
        { method: "POST", body: JSON.stringify({ email: data.email }) },
      );
    } catch (error) {
      if (!(error instanceof CustomerAuthError) || error.status === 429)
        throw error;
    }
    return Response.json({
      ok: true,
      message:
        "If an account exists, check your email for recovery instructions.",
    });
  }
  if (action === "login")
    return authenticatedResponse(
      await customerProvider("/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      }),
    );
  if (action === "verify") {
    if (
      typeof data.token_hash !== "string" ||
      !/^[A-Za-z0-9_-]{16,512}$/.test(data.token_hash) ||
      !["signup", "email", "recovery", "email_change"].includes(
        String(data.type),
      )
    )
      throw new CustomerAuthError(400, "Invalid verification link");
    return authenticatedResponse(
      await customerProvider("/verify", {
        method: "POST",
        body: JSON.stringify({ token_hash: data.token_hash, type: data.type }),
      }),
    );
  }
  if (action === "refresh") {
    const refresh = customerCookie(req, customerCookies.refresh);
    if (!refresh) throw new CustomerAuthError(401, "Sign in required");
    return authenticatedResponse(
      await customerProvider("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refresh }),
      }),
    );
  }
  if (action === "logout") {
    const token = customerCookie(req, customerCookies.access);
    const refresh = customerCookie(req, customerCookies.refresh);
    try {
      let revoked = false;
      if (token) {
        try {
          await customerProvider(
            "/logout?scope=local",
            { method: "POST" },
            token,
          );
          revoked = true;
        } catch (error) {
          if (!(error instanceof CustomerAuthError) || error.status !== 401)
            throw error;
        }
      }
      // A returning customer's access token may have expired; rotate its refresh
      // token so GoTrue can revoke the session before clearing local cookies.
      if (!revoked && refresh) {
        try {
          const replacement = await customerProvider(
            "/token?grant_type=refresh_token",
            {
              method: "POST",
              body: JSON.stringify({ refresh_token: refresh }),
            },
          );
          if (typeof replacement.access_token !== "string")
            throw new StorageUnavailable();
          await customerProvider(
            "/logout?scope=local",
            { method: "POST" },
            replacement.access_token,
          );
        } catch (error) {
          if (!(error instanceof CustomerAuthError) || error.status !== 401)
            throw error;
        }
      }
    } catch (error) {
      if (!(error instanceof StorageUnavailable)) throw error;
      return setSession(
        Response.json(
          {
            error:
              "Cookies cleared; authentication service could not confirm session revocation.",
          },
          { status: 503 },
        ),
        null,
      );
    }
    return setSession(Response.json({ ok: true }), null);
  }
  const token = customerCookie(req, customerCookies.access);
  const user = await customerIdentity(req);
  if (!user || !token) throw new CustomerAuthError(401, "Sign in required");
  if (action === "password") {
    if (!passwordValid(data.password))
      throw new CustomerAuthError(
        422,
        "Use a password of 12 to 128 characters",
      );
    await customerProvider(
      "/user",
      { method: "PUT", body: JSON.stringify({ password: data.password }) },
      token,
    );
    return Response.json({ ok: true });
  }
  if (
    typeof data.name !== "string" ||
    !data.name.trim() ||
    data.name.length > 200
  )
    throw new CustomerAuthError(422, "Enter your name");
  await customerProvider(
    "/user",
    {
      method: "PUT",
      body: JSON.stringify({ data: { name: data.name.trim() } }),
    },
    token,
  );
  return Response.json({ user: { ...user, name: data.name.trim() } });
}
