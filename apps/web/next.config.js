/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@evidentis/shared'],
  images: {
    unoptimized: true,
  },
  // Security headers now handled by middleware.ts for nonce-based CSP
};

module.exports = nextConfig;

