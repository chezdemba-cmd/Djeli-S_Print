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
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }];
  },
};

export default nextConfig;
