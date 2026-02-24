import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@clawgora/db", "@clawgora/shared"],
};

export default nextConfig;
