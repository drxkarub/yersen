import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, dishCategory, inDeck } from "./dishCategory.ts";

describe("dishCategory (gerçek Kasım 2026 menülerinden)", () => {
  it.each([
    // 02.11: çorba / ana / pilav / yan
    ["DÜĞÜN ÇORBA", 0, "corba"],
    ["ETLİ NOHUT", 1, "ana"],
    ["BULGUR PİLAVI", 2, "pilav"],
    ["MEVSİM SALATA", 3, "yan"],
    // 04.11: beş kalem; patates kızartması pilav değil, ana yemeğin yanı
    ["HAMBURGER KÖFTE", 1, "ana"],
    ["PATATES KIZARTMASI", 2, "ana"],
    ["SPAGETTİ NAPOLİTEN", 3, "pilav"],
    ["AYRAN", 4, "yan"],
    // tuzaklar
    ["ŞEHRİYE ÇORBA", 0, "corba"], // şehriye ama çorba
    ["ŞEHRİYELİ GÜVEÇ", 1, "ana"], // şehriyeli ama ana yemek
    ["ŞEHRİYELİ PİRİNÇ PİLAVI", 2, "pilav"],
    ["PEYNİRLİ BÖREK", 2, "pilav"],
    ["ÜZÜM KOMPOSTO", 3, "yan"],
    ["TULUMBA TATLISI", 3, "yan"],
    ["YOĞURT", 3, "yan"],
    ["YOĞURT ÇORBA", 0, "corba"], // yoğurt ama çorba
    ["MEYVE", 3, "yan"],
    ["ERİŞTE", 2, "pilav"],
    ["TAVUK DÖNER PATATES KIZARTMASI", 1, "ana"],
    // Kasım menülerinde yanlış çıkanlar
    ["ZEYTİNYAĞLI TAZE FASULYE", 2, "zeytinyagli"],
    ["ZEYTİNYAĞLI PIRASA", 2, "zeytinyagli"],
    ["BAZLAMALI YOĞURTLU KEBAP", 1, "ana"], // yoğurtlu ama kebap
    ["ÇİKOLATALI PUDİNG", 3, "yan"],
    ["FINDIKLI KEŞKÜL", 3, "yan"],
  ])("%s (sıra %i) → %s", (name, position, expected) => {
    expect(dishCategory(name, position)).toBe(expected);
  });

  it("anahtar kelime yoksa sıraya göre karar verir", () => {
    expect(dishCategory("BİLİNMEYEN", 0)).toBe("corba");
    expect(dishCategory("BİLİNMEYEN", 1)).toBe("ana");
    expect(dishCategory("BİLİNMEYEN", 2)).toBe("pilav");
    expect(dishCategory("BİLİNMEYEN", 3)).toBe("yan");
  });

  it("etiketler", () => {
    expect(CATEGORY_LABEL).toEqual({
      corba: "Çorba",
      ana: "Ana yemek",
      pilav: "Pilav/makarna",
      zeytinyagli: "Zeytinyağlı",
      yan: "Tatlı/salata/içecek",
    });
  });
});

describe("inDeck (kaydırma destesine sadece ana yemek ve tatlı girer)", () => {
  it.each([
    ["ETLİ NOHUT", 1, true],
    ["HAMBURGER KÖFTE", 1, true],
    ["TAVUK DÖNER PATATES KIZARTMASI", 1, true],
    ["TULUMBA TATLISI", 3, true],
    ["SÜTLAÇ", 3, true],
    ["KAZANDİBİ", 3, true],
    ["DÜĞÜN ÇORBA", 0, false],
    ["BULGUR PİLAVI", 2, false],
    ["SPAGETTİ NAPOLİTEN", 3, false],
    ["PATATES KIZARTMASI", 2, false], // ana yemeğin yanı, ayrı kart olmaz
    ["MEVSİM SALATA", 3, false],
    ["AYRAN", 4, false],
    ["YOĞURT", 3, false],
    ["MEYVE", 3, false],
    ["ZEYTİNYAĞLI BEZELYE", 2, false],
    ["BAZLAMALI YOĞURTLU KEBAP", 1, true],
    ["FINDIKLI KEŞKÜL", 3, true],
  ])("%s (sıra %i) → %s", (name, position, expected) => {
    expect(inDeck(name, position)).toBe(expected);
  });
});
