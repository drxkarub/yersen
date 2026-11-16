import type {
  InvitesResponse,
  MeResponse,
  SwipeChoice,
  TodayResponse,
  UpcomingResponse,
} from "@yersen/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    credentials: "same-origin",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, data.error ?? `http_${res.status}`);
  }
  if (res.status === 204 || res.status === 201 && res.headers.get("content-length") === "0") return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  me: () => call<MeResponse>("/me"),
  onboarding: (code: string, nickname: string) => call<void>("/onboarding", { body: { code, nickname } }),
  invites: () => call<InvitesResponse>("/invites"),
  today: () => call<TodayResponse>("/menu/today"),
  upcoming: () => call<UpcomingResponse>("/menu/upcoming"),
  swipe: (menuItemId: number, choice: SwipeChoice) => call<void>("/swipes", { body: { menuItemId, choice } }),
  rate: (menuItemId: number, score: number) => call<{ ratingId: number }>("/ratings", { body: { menuItemId, score } }),
  signInWithGoogle: async () => {
    const { url } = await call<{ url: string }>("/auth/sign-in/social", {
      body: { provider: "google", callbackURL: "/" },
    });
    window.location.assign(url);
  },
  signOut: () => call<void>("/auth/sign-out", { body: {} }),
};

/** Sunucu hata kodlarının kullanıcıya gösterilecek hali. Ne olduğunu ve ne yapılacağını söyler. */
export function errorText(err: unknown): string {
  const code = err instanceof ApiError ? err.code : "network";
  const messages: Record<string, string> = {
    invalid_code: "Bu davet kodu yok. Harfleri bir daha kontrol et.",
    used_code: "Bu kod kullanılmış. Davet edenden yeni bir kod iste.",
    nickname_invalid: "Takma ad 3-20 karakter olsun: harf, rakam, alt çizgi ya da nokta.",
    nickname_taken: "Bu takma ad alınmış. Bir harf değiştir, olur.",
    already_onboarded: "Zaten kayıtlısın. Sayfayı yenile.",
    window_closed: "Puanlama kapalı. Menü günü 11:30'dan ertesi gün 11:30'a kadar açık.",
    said_no: "Bu yemeğe 'yemem' demişsin. Önce kararını değiştir.",
    past_day: "Bu günün kararı artık değişmez.",
    rate_limited: "Biraz yavaş. Saatlik sınıra takıldın, birazdan tekrar dene.",
    banned: "Hesabın kapatılmış.",
    not_found: "Bu yemek menüde artık yok. Sayfayı yenile.",
    unauthorized: "Oturumun kapanmış. Yeniden giriş yap.",
    network: "Bağlantı yok gibi. İnternetini kontrol edip tekrar dene.",
  };
  return messages[code] ?? "Bir şeyler ters gitti. Sayfayı yenileyip tekrar dene.";
}
