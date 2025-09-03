/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization cache
  images: {
    unoptimized: true,
  },
  
  // Disable webpack cache in development
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = false;
      // Disable additional caching mechanisms
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named'
      };
    }
    return config;
  },
  
  // Disable static optimization in development
  experimental: {
    optimizeCss: false
  },
  
  // Force clean builds
  distDir: '.next',
  generateEtags: false,
  poweredByHeader: false
}

module.exports = nextConfig
