import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "TRIP OS",
        short_name: "TripOS",
        description: "Live AI Road Trip & Pilgrimage Operating System",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // Slice 1: precache the app shell so the app boots with zero network.
        // Slice 7 hardens this (navigateFallback, completeness checks).
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
