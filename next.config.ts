import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "prisma"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
