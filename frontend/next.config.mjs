/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The "@/..." alias comes from tsconfig `paths`, which Turbopack (the default
  // bundler since Next 16) resolves the same way in local dev, Docker, and
  // Vercel — no bundler-specific alias hook needed.
};

export default nextConfig;
