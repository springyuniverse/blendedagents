import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/tester/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/v1/tester/:path*`,
      },
      {
        source: '/api/v1/auth/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/v1/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
