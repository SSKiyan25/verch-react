import type { NextConfig } from "next";

const isLocal =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost");

const nextConfig: NextConfig = {
  cacheComponents: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    dangerouslyAllowLocalIP: isLocal,
    remotePatterns: [
      // 1. Google Auth Avatars
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // 2. Google Cloud Storage (Firebase / Student IDs)
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**", // You can restrict this to "/verch-cfaf7.appspot.com/**" for stricter security
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      // 3. Local Supabase (Docker Development)
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/**",
      },
      // 4. Production Supabase (Cloud)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
