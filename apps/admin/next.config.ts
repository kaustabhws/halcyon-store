import type { NextConfig } from "next";

const ADMIN_DOMAINS = [
  "admin.localhost:3001",
  "admin.localhost",
  process.env.ADMIN_PUBLIC_DOMAIN ?? "admin.example.com",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ADMIN_DOMAINS,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
