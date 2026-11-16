import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Üretimde API ön yüzü de servis eder (tek imaj). Geliştirmede ön yüzü Vite servis eder,
// /api istekleri olduğu gibi API'ye iletilir.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:3300" },
    },
  },
});
