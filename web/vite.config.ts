import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Üretimde nginx, /api/ isteklerini önekini kaldırarak 127.0.0.1:3300'e iletir.
// Geliştirmede aynı davranışı Vite proxy'si taklit eder.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3300",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
