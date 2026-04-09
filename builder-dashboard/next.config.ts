import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:4000'}/api/v1/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:4000'}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
