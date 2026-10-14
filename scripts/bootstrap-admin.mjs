// Offline only: writes protected settings to a NEW file outside this checkout.
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const [email, destination] = process.argv.slice(2);
const root = realpathSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
);
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !destination ||
  !path.isAbsolute(destination)
)
  throw Error(
    "Usage: feed password through stdin; node scripts/bootstrap-admin.mjs EMAIL /absolute/protected/path/settings.env",
  );
const parent = realpathSync(path.dirname(destination));
if (parent === root || parent.startsWith(root + path.sep))
  throw Error("Choose a protected path outside the repository.");
const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
if (password.length < 14 || password.length > 256 || password.includes("\n"))
  throw Error("Password must contain 14–256 characters.");
const salt = randomBytes(24).toString("hex");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const bits = Array.from(randomBytes(20), (b) =>
  b.toString(2).padStart(8, "0"),
).join("");
let totp = "";
for (let i = 0; i < bits.length; i += 5)
  totp += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
const body = `BLIES_ADMIN_EMAIL=${email}\nBLIES_ADMIN_PASSWORD_HASH=scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}\nBLIES_ADMIN_TOTP_SECRET=${totp}\nBLIES_SESSION_SECRET=${randomBytes(32).toString("hex")}\n`;
writeFileSync(path.join(parent, path.basename(destination)), body, {
  flag: "wx",
  mode: 0o600,
});
console.log(
  "Created protected settings file. Enrol TOTP and enter these settings securely in Vercel; no secrets were printed.",
);
