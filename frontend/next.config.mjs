import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Resolve the "@/..." alias explicitly so it works identically in local dev,
  // Docker, and Vercel — independent of how tsconfig `paths` get picked up.
  webpack: (config) => {
    config.resolve.alias["@"] = __dirname;
    return config;
  },
};

export default nextConfig;
