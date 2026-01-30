import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Update daftar external packages
  serverExternalPackages: ["tesseract.js", "pdf2json"],

  // Config lainnya
  experimental: {
     // reactCompiler: true, // (Hapus atau comment kalau bikin error)
  },
};

export default nextConfig;