import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WEB//SIGNAL",
    short_name: "WEB//SIGNAL",
    description: "A private signal for two.",
    start_url: "/",
    display: "standalone",
    background_color: "#071A3B",
    theme_color: "#071A3B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
