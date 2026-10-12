import { defineConfig } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
const secret = randomBytes(32).toString("hex");
export default defineConfig({
  testDir: "./tests/vercel",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3004",
    headless: true,
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm start -- --port 3004",
    url: "http://localhost:3004/en",
    reuseExistingServer: false,
    env: {
      VERCEL: "1",
      BLIES_STORAGE_MODE: "sqlite",
      BLIES_DATA_DIR: "/proc/blies-vercel-storage-denied",
      BLIES_SITE_URL: "http://localhost:3004",
      BLIES_ADMIN_EMAIL: "test-admin@example.test",
      BLIES_ADMIN_PASSWORD_HASH: `scrypt:test-salt:${scryptSync(secret, "test-salt", 64).toString("hex")}`,
      BLIES_ADMIN_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
      BLIES_SESSION_SECRET: secret,
      BLIES_SCAN_URL: "https://scanner.example.test",
      BLIES_SCAN_KEY: secret,
    },
  },
});
