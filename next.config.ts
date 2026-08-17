import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // A /public/images alatti statikus képek (hero SVG, márkagrafikák, OG képek)
  // hosszú távon cache-elhetők: a nevük stabil, változásnál új fájlnévvel kell
  // feltölteni. LCP: így a hero kép a második látogatástól a cache-ből jön.
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
