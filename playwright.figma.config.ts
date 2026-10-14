import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import path from "node:path";
const servers = Array.isArray(base.webServer)
  ? base.webServer
  : [base.webServer!];
const backend = {
  ...servers[1],
  env: { ...servers[1].env, BLIES_PUBLIC_ORIGINS: "http://localhost:3006" },
};
export default defineConfig({
  ...base,
  outputDir: "test-results/figma",
  testDir: "./tests/figma",
  workers: 1,
  use: { ...base.use, baseURL: "http://localhost:3006" },
  webServer: [
    servers[0],
    backend,
    {
      command:
        "node node_modules/vite/bin/vite.js --port 3006 --host 127.0.0.1",
      cwd: process.env.BLIES_FRONTEND_REPO || path.resolve("../BliesWebsite"),
      url: "http://localhost:3006",
      timeout: 60000,
      env: { BLIES_BACKEND_URL: "http://localhost:3001" },
    },
  ],
});
