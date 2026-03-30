import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/tester/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/v1/tester/:path*`,
      },
    ];
  },
};

export default nextConfig;
