/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  images: {
    localPatterns: [
      {
        pathname: '/placeholder.svg**',
        search: '',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  serverExternalPackages: ['canvas'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
  webpack: (config, { isServer }) => {
    // Ignore canvas on the server side (Fabric.js requirement)
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('canvas')
    }

    // Fix for Fabric.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    }

    return config
  },
  async redirects() {
    return [
      {
        source: '/designs',
        destination: '/editor',
        permanent: false,
      },
    ]
  },
};

module.exports = nextConfig;
