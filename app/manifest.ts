import type { MetadataRoute } from "next";

/** /manifest.webmanifest — lets a phone's "Add to Home Screen" show the real GiftPing mark and brand colours instead of a generic page icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiftPing — Your Companion for Every Occasion",
    short_name: "GiftPing",
    description: "A premium virtual gifting mall. Discover in-house and partner-vendor gifts for every occasion, and keep a personal Gifting Diary so you never miss a moment.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6f1",
    theme_color: "#0c2a1d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
