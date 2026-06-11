import type { NextConfig } from "next";

const STORE_DOMAINS = [
  "localhost:3000",
  "localhost",
  process.env.STOREFRONT_PUBLIC_DOMAIN,
].filter(Boolean) as string[];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Prisma's query engine out of the Turbopack trace/bundle so it loads
  // from node_modules at runtime instead of being mis-bundled on Vercel.
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    serverActions: {
      allowedOrigins: STORE_DOMAINS,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.dummyjson.com" },
    ],
  },
};

export default nextConfig;
