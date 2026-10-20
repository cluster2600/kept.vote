/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The root layout sits under app/[lang], so unmatched URLs need a
    // self-contained 404 (app/global-not-found.tsx).
    globalNotFound: true,
  },
  // The "@/..." alias comes from tsconfig `paths`, which Turbopack (the default
  // bundler since Next 16) resolves the same way in local dev, Docker, and
  // Vercel — no bundler-specific alias hook needed.
};

export default nextConfig;
