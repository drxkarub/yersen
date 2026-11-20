import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.tsx";
import { captureInviteFromUrl } from "./invite.ts";
import "./styles.css";

captureInviteFromUrl();

const root = document.getElementById("root");
if (!root) throw new Error("#root bulunamadı");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Yeni sürüm: service worker kontrolü alınca sayfa bir kez kendini yeniler (autoUpdate).
// Ana ekrandaki uygulama hiç yeniden açılmadığı için güncellemeyi kendimiz soruyoruz:
// uygulama öne geldiğinde ve saatte bir.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => {
      if (navigator.onLine) void reg.update().catch(() => {});
    };
    setInterval(check, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
  },
});
