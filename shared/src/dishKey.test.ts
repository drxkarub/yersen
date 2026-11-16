import { describe, expect, it } from "vitest";
import { dishKey } from "./dishKey.ts";

describe("dishKey (CLAUDE.md eşleşme kuralları)", () => {
  it("Türkçe büyük/küçük harfi doğru çevirir: İ -> i, I -> ı", () => {
    expect(dishKey("ETLİ NOHUT")).toBe("etli nohut");
    expect(dishKey("PİRİNÇ PİLAVI")).toBe("pirinç pilavı");
    expect(dishKey("Pirinç Pilavı")).toBe(dishKey("PİRİNÇ PİLAVI"));
  });

  it("parantez içindeki yüzde eklerini siler", () => {
    expect(dishKey("MEYVE SUYU (%50)")).toBe("meyve suyu");
    expect(dishKey("AYRAN (% 100)")).toBe("ayran");
    expect(dishKey("SÜZME MERCİMEK (%50) ÇORBA")).toBe("süzme mercimek çorba");
  });

  it("yüzde içermeyen parantezlere dokunmaz", () => {
    expect(dishKey("KÖFTE (IZGARA)")).toBe("köfte (ızgara)");
  });

  it("baştaki/sondaki boşlukları siler, çoklu boşluğu teke indirir", () => {
    expect(dishKey("  DÜĞÜN   ÇORBA \n")).toBe("düğün çorba");
  });

  it("ayraçsız iki yemekli satırı bölmez", () => {
    expect(dishKey("TAVUK DÖNER PATATES KIZARTMASI")).toBe("tavuk döner patates kızartması");
  });

  it("başka normalizasyon yapmaz (noktalama, ek, yazım farkı korunur)", () => {
    expect(dishKey("DÜĞÜN ÇORBA")).not.toBe(dishKey("DÜĞÜN ÇORBASI"));
    expect(dishKey("ETLİ NOHUT.")).toBe("etli nohut.");
  });
});
