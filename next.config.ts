import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { proxyClientMaxBodySize: "32mb" },
};
export default config;
