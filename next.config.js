/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      {
        // Supabase Storage — source chính cho restaurant images
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Supabase Storage signed URLs
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        // Supabase Storage (custom domain nếu có)
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google Maps Static API (nếu dùng)
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        // Google user avatars (OAuth login)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Unsplash — seed data & external images
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Unsplash CDN
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        // Allow all other HTTPS image sources (admin-entered external URLs)
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;