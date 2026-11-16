// API ile ön yüzün paylaştığı cevap tipleri.

export type SwipeChoice = "yes" | "no" | "maybe";

export type MenuItemView = {
  menuItemId: number;
  dishId: number;
  rawName: string; // menüde yazdığı gibi
  imageUrl: string | null; // temsili görsel (yoksa ön yüz ikon gösterir)
  imageCredit: string | null; // "Yazar, lisans"
  imageSourceUrl: string | null; // atıf bağlantısı
  average: number | null; // yemeğin tüm günlerdeki ortalaması (tek havuz)
  votes: number;
  myChoice: SwipeChoice | null;
  myScore: number | null; // bu günün puanı
};

export type DayMenuView = {
  date: string; // YYYY-MM-DD
  kcal: number | null;
  ratingOpen: boolean;
  opensAt: string; // ISO
  closesAt: string; // ISO
  items: MenuItemView[];
};

export type MeResponse = {
  user: { name: string; image: string | null };
  profile: { nickname: string; role: "user" | "moderator" | "admin" } | null;
};

export type TodayResponse = { today: DayMenuView | null; next: DayMenuView | null };
export type UpcomingResponse = { days: DayMenuView[] };
export type InvitesResponse = { codes: { code: string; usedBy: string | null }[] };
export type ApiError = { error: string };
