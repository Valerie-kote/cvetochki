import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel сам использует output: "standalone" если нужно
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
