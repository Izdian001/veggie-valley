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
    }
    return config;
  },
}

module.exports = nextConfig
