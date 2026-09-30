import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@ks1j/shared"],
};

export default nextConfig;
