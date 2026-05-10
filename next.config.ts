import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
    ],
    deviceSizes: [375, 768, 1024, 1440],
    imageSizes: [16, 32, 64, 128, 256, 512],
  },
  compress: true,
}

export default nextConfig
