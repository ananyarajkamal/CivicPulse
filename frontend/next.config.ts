import type { NextConfig } from "next";

const rawTarget =
  process.env.BACKEND_API_URL ||
  "https://civicpulse-api-i6ne.onrender.com/api/v1";
const cleanTarget = rawTarget.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${cleanTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
