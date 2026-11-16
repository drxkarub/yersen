// Türkiye 2016'dan beri yaz saati uygulamıyor: Europe/Istanbul sabit UTC+3.
// Sunucu ve konteyner UTC'de çalışabilir; "bugün" her zaman burada İstanbul'a göre hesaplanır.
const ISTANBUL_OFFSET = "+03:00";
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** İstanbul'a göre takvim günü (YYYY-MM-DD). */
export function istanbulDate(now: Date): string {
  return dateFormat.format(now);
}

/** Puanlama penceresi: menü günü 11:30'dan ertesi gün 11:30'a (İstanbul). */
export function ratingWindow(menuDate: string): { opensAt: Date; closesAt: Date } {
  const opensAt = new Date(`${menuDate}T11:30:00${ISTANBUL_OFFSET}`);
  if (Number.isNaN(opensAt.getTime())) throw new Error(`Geçersiz tarih: ${menuDate}`);
  const closesAt = new Date(opensAt.getTime() + 24 * 60 * 60 * 1000);
  return { opensAt, closesAt };
}

export function isRatingOpen(menuDate: string, now: Date): boolean {
  const { opensAt, closesAt } = ratingWindow(menuDate);
  return now >= opensAt && now < closesAt;
}
