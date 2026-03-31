// Next.js configuration for the travel planner application
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
// Build timestamp: Tue Mar 31 18:52:12 -03 2026
