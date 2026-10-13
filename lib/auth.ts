import { persistentStorageEnabled } from "./storage-policy";
import { sameOrigin } from "@/lib/security";
import "server-only";
import { cookies } from "next/headers";
import {
  createHmac,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
export type Role = "admin" | "editor" | "sales";
export type Session = { user: string; role: Role; exp: number; csrf: string };
type Account = {
  email: string;
  role: Role;
  passwordHash: string;
  totpSecret: string;
};
export function accounts(): Account[] {
  let result: Account[] = [];
  try {
    const data = JSON.parse(process.env.BLIES_STAFF_ACCOUNTS_JSON || "[]");
    if (Array.isArray(data))
      result = data.filter(
        (a) =>
          typeof a.email === "string" &&
          ["admin", "editor", "sales"].includes(a.role) &&
          typeof a.passwordHash === "string" &&
          typeof a.totpSecret === "string",
      );
  } catch {}
  if (
    process.env.BLIES_ADMIN_EMAIL &&
    process.env.BLIES_ADMIN_PASSWORD_HASH &&
    process.env.BLIES_ADMIN_TOTP_SECRET
  )
    result.push({
      email: process.env.BLIES_ADMIN_EMAIL,
      role: "admin",
      passwordHash: process.env.BLIES_ADMIN_PASSWORD_HASH,
      totpSecret: process.env.BLIES_ADMIN_TOTP_SECRET,
    });
  return result;
}
export const authReady = () =>
  !!(
    persistentStorageEnabled() &&
    accounts().length &&
    process.env.BLIES_SESSION_SECRET &&
    process.env.BLIES_SESSION_SECRET.length >= 32
  );
function equal(a: string, b: string) {
  return (
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
function base32(s: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.toUpperCase().replace(/=|\s/g, "")) {
    const i = chars.indexOf(c);
    if (i < 0) return Buffer.alloc(0);
    bits += i.toString(2).padStart(5, "0");
  }
  return Buffer.from((bits.match(/.{8}/g) || []).map((x) => parseInt(x, 2)));
}
export function validTotp(token: string, secret: string, now = Date.now()) {
  if (!/^\d{6}$/.test(token)) return false;
  const key = base32(secret);
  if (key.length < 10) return false;
  for (const offset of [-1, 0, 1]) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(Math.floor(now / 30000) + offset));
    const h = createHmac("sha1", key).update(b).digest();
    const i = h[19] & 15;
    const code = ((h.readUInt32BE(i) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, "0");
    if (equal(token, code)) return true;
  }
  return false;
}
export function validPassword(password: string, hash: string) {
  const [algorithm, salt, value] = hash.split(":");
  if (algorithm !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(value || ""))
    return false;
  try {
    return equal(scryptSync(password, salt, 64).toString("hex"), value);
  } catch {
    return false;
  }
}
export function checkLogin(email: string, password: string, token: string) {
  const account = accounts().find((a) => equal(a.email, email));
  return !!(
    authReady() &&
    account &&
    validPassword(password, account.passwordHash) &&
    validTotp(token, account.totpSecret)
  );
}
export function signSession(s: Session) {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${body}.${createHmac("sha256", process.env.BLIES_SESSION_SECRET!).update(body).digest("base64url")}`;
}
export async function session() {
  if (!authReady()) return null;
  const raw = (await cookies()).get("blies_admin")?.value;
  if (!raw) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", process.env.BLIES_SESSION_SECRET!)
    .update(body)
    .digest("base64url");
  if (!equal(signature, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (
      s.exp < Date.now() ||
      !["admin", "editor", "sales"].includes(s.role) ||
      !accounts().some((a) => a.email === s.user && a.role === s.role)
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
export function newSession(email: string): Session {
  const account = accounts().find((a) => a.email === email)!;
  return {
    user: account.email,
    role: account.role,
    exp: Date.now() + 3600000,
    csrf: randomBytes(24).toString("hex"),
  };
}
export async function authorise(req: Request, roles: Role[], mutation = false) {
  const s = await session();
  if (!s || !roles.includes(s.role)) return null;
  if (
    mutation &&
    (req.headers.get("x-csrf-token") !== s.csrf || !sameOrigin(req))
  )
    return null;
  return s;
}
