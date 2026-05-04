import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Каталог приложения при `npm run build` из `frontend/` — стабилизирует standalone при лишнем lockfile в корне репо. */
  turbopack: {
    root: ".",
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
