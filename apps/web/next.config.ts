import type { NextConfig } from "next";

// PAGES_BASE_PATH (e.g. "/KS1J") builds a static copy for GitHub Pages preview.
// Normal builds (local, Vercel) are unaffected.
const pagesBasePath = process.env.PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  // The shared package ships TypeScript source; Next compiles it with the app.
  transpilePackages: ["@ks1j/shared"],
  ...(pagesBasePath
    ? { output: "export" as const, basePath: pagesBasePath, trailingSlash: true, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
