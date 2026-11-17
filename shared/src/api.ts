// API ile ön yüzün paylaştığı cevap tipleri.

export type SwipeChoice = "yes" | "no" | "maybe";

export type MenuItemView = {
  menuItemId: number;
  dishId: number;
  rawName: string; // menüde yazdığı gibi
  category: "corba" | "ana" | "pilav" | "yan"; // bkz. dishCategory
  inDeck: boolean; // kaydırma destesine girer mi (ana yemek, tatlı); bkz. inDeck
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
/** Bir gün ve menülü komşu günleri (geri/ileri gezinme için). */
export type DayNavResponse = { date: string; today: string; day: DayMenuView | null; prevDate: string | null; nextDate: string | null };
export type UpcomingResponse = { days: DayMenuView[] };
export type InvitesResponse = { codes: { code: string; usedBy: string | null }[] };
export type ApiError = { error: string };
