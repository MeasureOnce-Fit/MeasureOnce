import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // TypeScript is checked separately with `npm run typecheck` before builds.
  typescript: { ignoreBuildErrors: true },
  experimental: { workerThreads: true, cpus: 1 },
};

export default nextConfig;
