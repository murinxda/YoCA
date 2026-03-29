import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YoCA – Yo Cost Average",
    short_name: "YoCA",
    description:
      "Automated DCA into yield-bearing Yo Protocol vaults on Base. Deposit stables, set your strategy, and earn yield while you accumulate.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#6366F1",
    icons: [
      {
        src: "/icon-48.png",
        sizes: "48x48",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
