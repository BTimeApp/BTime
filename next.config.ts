import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets-staging.worldcubeassociation.org",
        port: "",
        pathname: "**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "avatars.worldcubeassociation.org",
        port: "",
        pathname: "**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
