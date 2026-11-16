import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 头像、执照照片上传（单张 5MB 以内，两张一起提交）
    serverActions: { bodySizeLimit: "11mb" },
  },
  poweredByHeader: false,
};

export default nextConfig;
