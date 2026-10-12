/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for the Cloud Run container (web/Dockerfile).
  output: 'standalone',
};

module.exports = nextConfig;
