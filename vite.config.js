import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/gohan-biyori/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "ごはん日和",
        short_name: "ごはん日和",
        description: "定食から献立と買い物リストを作れる自炊アプリ",
        theme_color: "#fff0f5",
        background_color: "#fffaf7",
        display: "standalone",
        start_url: "/gohan-biyori/",
        scope: "/gohan-biyori/",
        icons: [
          {
            src: "/gohan-biyori/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/gohan-biyori/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,csv}"],
      },
    }),
  ],
});