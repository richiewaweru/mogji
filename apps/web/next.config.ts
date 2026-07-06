import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mogji/core", "@mogji/tokens"]
};

export default nextConfig;
