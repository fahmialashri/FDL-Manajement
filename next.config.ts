import type { NextConfig } from "next";

const nextConfig: any = {
  serverExternalPackages: ["tesseract.js", "pdf2json"],

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    // paksa Next ikut bundling chromium files
    outputFileTracingIncludes: {
      "*": ["node_modules/@sparticuz/chromium-min/**"],
    },
  },
};

export default nextConfig;
