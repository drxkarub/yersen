import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Üretimde API ön yüzü de servis eder (tek imaj). Geliştirmede ön yüzü Vite servis eder,
// /api ve /img istekleri olduğu gibi API'ye iletilir.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // kayıt main.tsx'te: yeni sürüm gelince sayfa kendini yeniler
      includeAssets: ["icon.svg", "favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "yersen",
        short_name: "yersen",
        description: "Yemekhanenin menüsü, puanları ve senin hükmün.",
        lang: "tr",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f3f5fa",
        theme_color: "#112a79",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        // Uygulama kabuğu önbellekte (hızlı açılış). Menü ve puanlar her zaman canlı:
        // /api bilerek önbelleğe alınmaz, eski menü ya da eski puan gösterilmesin.
        clientsClaim: true, // yeni sürüm açık sekmeyi hemen devralır
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/img\//],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/img/"),
            handler: "CacheFirst",
            options: { cacheName: "yemek-gorselleri", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:3300" },
      "/img": { target: "http://127.0.0.1:3300" },
    },
  },
});
