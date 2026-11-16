/**
 * Yemek eşleşme anahtarı (CLAUDE.md "Eşleşme anahtarı"). Kurallar bunlardır, başka normalizasyon yapılmaz:
 *   1. Parantez içindeki yüzde ekleri silinir: "(%50)", "(% 100)".
 *   2. Baştaki/sondaki boşluk silinir, çoklu boşluk teke indirilir.
 *   3. Türkçe yerel ayarıyla küçük harfe çevrilir (İ -> i, I -> ı).
 */
export function dishKey(raw: string): string {
  return raw
    .replace(/\(\s*%\s*\d+(?:[.,]\d+)?\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}
