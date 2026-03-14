import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname,
      "localhost",
      "lh3.googleusercontent.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
