import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  experimental: { proxyClientMaxBodySize: "32mb" },
};
export default config;
