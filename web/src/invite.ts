import { parseInviteCode } from "@yersen/shared";

// ?davet=KOD ile gelen kod, Google girişinin gidiş-dönüşünde kaybolmasın diye saklanır.
// Tarayıcı depolaması kapalıysa (gizli sekme vb.) kod yalnızca bu sayfa yüklemesinde kalır.
const KEY = "yersen.davetKodu";
let memory: string | null = null;

/** Sayfa açılırken bir kez: adresteki kodu al, sakla, adresten sil (paylaşılırsa ya da geri gelinirse görünmesin). */
export function captureInviteFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("davet")) return;
  const code = parseInviteCode(url.searchParams.get("davet"));
  // Uygulama içi tarayıcıda adres kalsın: "Tarayıcıda aç" bu adresi taşır, kod orada da dolsun.
  if (!inAppBrowser()) {
    url.searchParams.delete("davet");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  if (!code) return;
  memory = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* depolama kapalı */
  }
}

export function pendingInvite(): string | null {
  try {
    return memory ?? parseInviteCode(localStorage.getItem(KEY));
  } catch {
    return memory;
  }
}

export function clearInvite() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* depolama kapalı */
  }
}

/** Google, uygulama içi tarayıcılarda (Instagram, Facebook…) girişi engeller. */
export const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Line\/|Snapchat|TikTok|musical_ly/i.test(navigator.userAgent);
