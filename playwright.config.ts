import { defineConfig } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
process.env.BLIES_TEST_PASSWORD ||= randomBytes(24).toString("hex");
process.env.BLIES_TEST_TOTP ||= "JBSWY3DPEHPK3PXP";
process.env.BLIES_TEST_DATA ||= `/tmp/blies-tests-${randomBytes(8).toString("hex")}`;
process.env.BLIES_TEST_SCAN_KEY ||= randomBytes(24).toString("hex");
mkdirSync(process.env.BLIES_TEST_DATA, { recursive: true, mode: 0o700 });
const cert = `${process.env.BLIES_TEST_DATA}/scanner.crt`,
  key = `${process.env.BLIES_TEST_DATA}/scanner.key`;
if (!existsSync(cert))
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      key,
      "-out",
      cert,
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ],
    { stdio: "ignore" },
  );
export default defineConfig({
  testDir: "./tests/browser",
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/scanner.mjs",
      port: 3002,
      env: {
        BLIES_TEST_TLS_KEY: key,
        BLIES_TEST_TLS_CERT: cert,
        BLIES_TEST_SCAN_KEY: process.env.BLIES_TEST_SCAN_KEY,
      },
    },
    {
      command: "npm run dev -- --port 3001",
      url: "http://localhost:3001/en",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        BLIES_DATA_DIR: process.env.BLIES_TEST_DATA,
        BLIES_SITE_URL: "http://localhost:3001",
        NODE_EXTRA_CA_CERTS: cert,
        BLIES_SCAN_URL: "https://localhost:3002/scan",
        BLIES_SCAN_KEY: process.env.BLIES_TEST_SCAN_KEY,
        BLIES_ADMIN_EMAIL: "admin@example.test",
        BLIES_ADMIN_PASSWORD_HASH: `scrypt:test-only-salt:${scryptSync(process.env.BLIES_TEST_PASSWORD, "test-only-salt", 64).toString("hex")}`,
        BLIES_ADMIN_TOTP_SECRET: process.env.BLIES_TEST_TOTP,
        BLIES_STAFF_ACCOUNTS_JSON: JSON.stringify(
          ["editor", "sales"].map((role) => ({
            email: `${role}@example.test`,
            role,
            passwordHash: `scrypt:test-only-salt:${scryptSync(process.env.BLIES_TEST_PASSWORD!, "test-only-salt", 64).toString("hex")}`,
            totpSecret: process.env.BLIES_TEST_TOTP,
          })),
        ),
        BLIES_SESSION_SECRET: randomBytes(32).toString("hex"),
      },
    },
  ],
});
