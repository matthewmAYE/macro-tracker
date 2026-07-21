import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack from bundling whatsapp-web.js and its transitive deps
  // (unzipper → @aws-sdk/client-s3 etc.) — they're Node-only and must run as-is.
  serverExternalPackages: ["whatsapp-web.js"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
