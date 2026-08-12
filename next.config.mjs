/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'canvas', 'chart.js'],
    outputFileTracingExcludes: {
      '*': [
        '**/node_modules/xlsx/**',
        '**/node_modules/canvas/**',
      ],
    },
  },
};

export default nextConfig;
