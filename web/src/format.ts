/** Menüdeki BÜYÜK HARF adı, Türkçe kurallarıyla sadece ilk harfi büyük gösterir ("ETLİ NOHUT" -> "Etli nohut"). */
export function displayName(raw: string): string {
  const lower = raw.trim().toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}
