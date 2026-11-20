// API ile ön yüzün paylaştığı cevap tipleri.

export type SwipeChoice = "yes" | "no" | "maybe";

export type MenuItemView = {
  menuItemId: number;
  dishId: number;
  rawName: string; // menüde yazdığı gibi
  category: "corba" | "ana" | "pilav" | "zeytinyagli" | "yan"; // bkz. dishCategory
  inDeck: boolean; // kaydırma destesine girer mi (ana yemek, tatlı); bkz. inDeck
  imageUrl: string | null; // temsili görsel (yoksa ön yüz ikon gösterir)
  imageCredit: string | null; // "Yazar, lisans"
  imageSourceUrl: string | null; // atıf bağlantısı
  average: number | null; // yalnızca bu günün puanları (aynı yemek başka gün sıfırdan başlar)
  votes: number;
  pastAverage: number | null; // aynı yemeğin bu günden önceki çıkışları (kaydırırken fikir verir)
  pastVotes: number;
  myChoice: SwipeChoice | null;
  myScore: number | null; // bu günün puanı
};

/** Günün tepsisinin gerçek fotoğrafı (moderatör/admin yükler). */
export type TrayPhotoView = { id: number; url: string; uploadedBy: string | null };

export type DayMenuView = {
  date: string; // YYYY-MM-DD
  kcal: number | null;
  ratingOpen: boolean;
  opensAt: string; // ISO
  closesAt: string; // ISO
  items: MenuItemView[];
  trayPhotos: TrayPhotoView[]; // yoksa boş: ön yüz hiçbir şey göstermez
};

export type MeResponse = {
  user: { name: string; image: string | null };
  profile: { nickname: string; role: "user" | "moderator" | "admin" } | null;
};

export type TodayResponse = { today: DayMenuView | null; next: DayMenuView | null };
/** Bir gün ve menülü komşu günleri (geri/ileri gezinme için). */
export type DayRatersResponse = { dishes: { dishId: number; raters: { nickname: string | null; score: number }[] }[] };

export type DayNavResponse = { date: string; today: string; day: DayMenuView | null; prevDate: string | null; nextDate: string | null };
export type UpcomingResponse = { days: DayMenuView[] };
export type InvitesResponse = { codes: { code: string; usedBy: string | null }[] };
export type ApiError = { error: string };
