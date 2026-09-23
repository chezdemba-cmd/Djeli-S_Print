import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const sharedEnvFile = fileURLToPath(new URL("../../.env.local", import.meta.url));
if (existsSync(sharedEnvFile)) process.loadEnvFile(sharedEnvFile);

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@djelis-print/contracts"],
};

export default nextConfig;
