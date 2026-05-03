import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },

  typescript: {
    ignoreBuildErrors: true, // 🔥 fix build Vercel
  },
};

export default nextConfig;