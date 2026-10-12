import { defineConfig } from "@playwright/test";
import base from "./playwright.vercel.config";
const server = Array.isArray(base.webServer)
  ? base.webServer[0]
  : base.webServer!;
export default defineConfig({
  ...base,
  testDir: "./tests/storage-failure",
  use: { ...base.use, baseURL: "http://localhost:3005" },
  webServer: {
    ...server,
    command: "npm start -- --port 3005",
    url: "http://localhost:3005/en",
    env: {
      ...server.env,
      VERCEL: "",
      VERCEL_ENV: "",
      BLIES_STORAGE_MODE: "sqlite",
      BLIES_DATA_DIR: "/dev/null/private-storage",
      BLIES_SITE_URL: "http://localhost:3005",
    },
  },
});
