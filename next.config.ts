import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Supabase packages are bundled for server to avoid vendor-chunk issues in dev
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
};

export default nextConfig;
