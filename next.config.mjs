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
    outputFileTracingExcludes: {
      '*': [
        '**/node_modules/xlsx/**',
        '**/node_modules/canvas/**',
      ],
    },
  },
};

export default nextConfig;
