import type { NextConfig } from "next";

const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN || 'assets.branddock.com';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      // DiceBear avatars (persona fallback)
      { protocol: 'https', hostname: '*.dicebear.com' },
      // R2 object storage (production uploads)
      { protocol: 'https', hostname: r2PublicDomain },
      // Local development uploads
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
