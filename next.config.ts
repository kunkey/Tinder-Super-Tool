import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tắt typedRoutes hoàn toàn để tránh sinh types lỗi trong .next/dev/types/routes.d.ts
  typedRoutes: false,
};

export default nextConfig;
