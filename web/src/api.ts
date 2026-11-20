import type {
  DayNavResponse,
  DayRatersResponse,
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
  moreInvites: () => call<InvitesResponse>("/invites/more", { body: {} }),
  today: () => call<TodayResponse>("/menu/today"),
  day: (date?: string) => call<DayNavResponse>(date ? `/menu/day?date=${date}` : "/menu/day"),
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
  deleteAccount: (confirmNickname: string) => call<void>("/me", { method: "DELETE", body: { confirmNickname } }),
  admin: {
    overview: () => call<{ role: "admin" | "moderator"; scrapeRuns: { id: number; at: string; ok: boolean; message: string }[] }>("/admin/overview"),
    dayRaters: (date: string) => call<DayRatersResponse>(`/admin/days/${date}/ratings`),
    users: () =>
      call<{ users: { id: string; nickname: string; role: "user" | "moderator" | "admin"; invitedBy: string | null; banned: boolean }[] }>(
        "/admin/users",
      ),
    setModerator: (id: string, moderator: boolean) => call<void>(`/admin/users/${encodeURIComponent(id)}/moderator`, { body: { moderator } }),
    dishes: (q: string) =>
      call<{ dishes: { id: number; displayName: string; imageUrl: string | null; imageCredit: string | null; imageSourceUrl: string | null; imageLocked: boolean }[] }>(
        `/admin/dishes?q=${encodeURIComponent(q)}`,
      ),
    uploadDishImage: async (id: number, file: File) => {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/admin/dishes/${id}/image`, { method: "POST", body: form, credentials: "same-origin" });
      if (!res.ok) throw new ApiError(res.status, ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `http_${res.status}`);
      return (await res.json()) as { imageUrl: string };
    },
    removeDishImage: (id: number) => call<void>(`/admin/dishes/${id}/image`, { method: "DELETE" }),
    uploadTrayPhoto: async (date: string, file: File) => {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/admin/days/${date}/tray`, { method: "POST", body: form, credentials: "same-origin" });
      if (!res.ok) throw new ApiError(res.status, ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `http_${res.status}`);
      return (await res.json()) as { id: number; url: string };
    },
    removeTrayPhoto: (id: number) => call<void>(`/admin/tray/${id}`, { method: "DELETE" }),
  },
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
    forbidden: "Bunun için yetkin yok.",
    cannot_change_admin: "Yöneticinin rolü panelden değiştirilemez.",
    invalid_image: "Bu dosya bir fotoğraf değil ya da bozuk.",
    too_large: "Fotoğraf çok büyük (en fazla 10 MB).",
    future_day: "Bu günün tepsisi daha çıkmadı.",
    too_many_photos: "Bu güne 6 fotoğraf yeter. Birini kaldırıp yenisini ekle.",
    confirm_mismatch: "Takma adın tutmadı. Aynen yaz.",
    admin_cannot_delete: "Yönetici hesabı silinemez.",
    network: "Bağlantı yok gibi. İnternetini kontrol edip tekrar dene.",
  };
  return messages[code] ?? "Bir şeyler ters gitti. Sayfayı yenileyip tekrar dene.";
}
