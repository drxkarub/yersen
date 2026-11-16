import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, dishCategory } from "./dishCategory.ts";

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
    expect(CATEGORY_LABEL).toEqual({ corba: "Çorba", ana: "Ana yemek", pilav: "Pilav/makarna", yan: "Tatlı/salata/içecek" });
  });
});
