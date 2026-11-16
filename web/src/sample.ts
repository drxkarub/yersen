// ÖRNEK VERİ. Gerçek menü ve puanlar Faz 1'de API'den gelecek.
// Yemek adları trakya.edu.tr'deki 16.11.2026 menüsünden aynen alındı; puanlar ve oy sayıları uydurmadır.

export type Dish = {
  id: string;
  rawName: string; // menüde yazdığı gibi
  average: number | null;
  votes: number;
};

export type DayMenu = {
  date: string; // YYYY-MM-DD
  ticketNo: number;
  kcal: number;
  dishes: Dish[];
};

export const sampleToday: DayMenu = {
  date: "2026-11-16",
  ticketNo: 316,
  kcal: 916,
  dishes: [
    { id: "dugun-corba", rawName: "DÜĞÜN ÇORBA", average: 8.1, votes: 42 },
    { id: "etli-nohut", rawName: "ETLİ NOHUT", average: 7.6, votes: 39 },
    { id: "pirinc-pilavi", rawName: "PİRİNÇ PİLAVI", average: 6.9, votes: 35 },
    { id: "yogurt", rawName: "YOĞURT", average: 5.0, votes: 3 },
  ],
};

/** Menüdeki BÜYÜK HARF adı, Türkçe kurallarıyla sadece ilk harfi büyük gösterir ("ETLİ NOHUT" -> "Etli nohut"). */
export function displayName(raw: string): string {
  const lower = raw.trim().toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

// Yemek adları Kasım 2026 menüsünden alındı (gerçek Ekim sıralaması değil); puanlar uydurmadır.
export const sampleLastMonthBest: Dish[] = [
  { id: "tavuk-doner", rawName: "TAVUK DÖNER PATATES KIZARTMASI", average: 8.7, votes: 51 },
  { id: "et-tantuni", rawName: "ET TANTUNİ", average: 8.4, votes: 47 },
  { id: "hamburger-kofte", rawName: "HAMBURGER KÖFTE", average: 8.2, votes: 44 },
];

/** Aynı menü, henüz kimse puanlamamışken (11:30 öncesi ya da sıradaki gün). */
export const sampleNotYetRated: DayMenu = {
  ...sampleToday,
  dishes: sampleToday.dishes.map((d) => ({ ...d, average: null, votes: 0 })),
};
