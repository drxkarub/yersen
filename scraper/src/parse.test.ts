import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMenuPage } from "./parse.ts";

const fixture = (name: string) => readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), "utf8");
const real = fixture("yemeklistesi-2026-11-16.html");

describe("parseMenuPage: gerçek sayfa (16.11.2026, BUGÜN hücresi var)", () => {
  const result = parseMenuPage(real, "2026-11-16");

  it("ayın bütün hafta içi günlerini çıkarır", () => {
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.days).toHaveLength(21);
    expect(result.days[0]?.date).toBe("2026-11-02");
    expect(result.days.at(-1)?.date).toBe("2026-11-30");
  });

  it("bir günün yemeklerini menüde yazdığı gibi ve kalorisini çıkarır", () => {
    if (result.kind !== "ok") throw new Error(result.kind);
    expect(result.days[0]).toEqual({
      date: "2026-11-02",
      dishes: ["DÜĞÜN ÇORBA", "ETLİ NOHUT", "BULGUR PİLAVI", "MEVSİM SALATA"],
      kcal: 872,
    });
  });

  it("BUGÜN hücresine bugünün tarihini verir", () => {
    if (result.kind !== "ok") throw new Error(result.kind);
    const today = result.days.find((d) => d.date === "2026-11-16");
    expect(today?.dishes).toEqual(["DÜĞÜN ÇORBA", "ETLİ NOHUT", "PİRİNÇ PİLAVI", "YOĞURT"]);
    expect(today?.kcal).toBe(916);
  });

  it("ayraçsız iki yemekli satırı tek yemek olarak bırakır", () => {
    if (result.kind !== "ok") throw new Error(result.kind);
    const day = result.days.find((d) => d.date === "2026-11-09");
    expect(day?.dishes).toContain("TAVUK DÖNER PATATES KIZARTMASI");
  });

  it("tarihler sıralı ve tekil", () => {
    if (result.kind !== "ok") throw new Error(result.kind);
    const dates = result.days.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe("parseMenuPage: BUGÜN tutarlılığı", () => {
  it("bugün komşu tarihlerle çelişiyorsa 'broken' döner", () => {
    // Sayfada 13.11 ile 17.11 arasında duran BUGÜN hücresi 20.11 olamaz.
    const result = parseMenuPage(real, "2026-11-20");
    expect(result.kind).toBe("broken");
  });
});

describe("parseMenuPage: menü yayınlanmamış", () => {
  it("tablo var ama hücre yoksa 'unpublished' döner", () => {
    expect(parseMenuPage(fixture("unpublished.html"), "2026-12-01")).toEqual({ kind: "unpublished" });
  });
});

describe("parseMenuPage: sayfa yapısı değişmiş", () => {
  it("#ylistTable yoksa 'broken' döner", () => {
    const result = parseMenuPage(fixture("broken-no-table.html"), "2026-11-16");
    expect(result.kind).toBe("broken");
  });

  it("hücrede tarih biçimi tanınmıyorsa 'broken' döner", () => {
    const html = real.replace("02.11.2026", "2 Kasım");
    expect(parseMenuPage(html, "2026-11-16").kind).toBe("broken");
  });

  it("hücrede hiç yemek yoksa 'broken' döner", () => {
    const html = `<div id="ylistTable"><div class="mitem"><div><h4>02.11.2026</h4><small>872 Kal</small></div></div></div>`;
    expect(parseMenuPage(html, "2026-11-16").kind).toBe("broken");
  });
});
