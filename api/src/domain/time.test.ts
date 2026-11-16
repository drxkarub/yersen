import { describe, expect, it } from "vitest";
import { istanbulDate, isRatingOpen, ratingWindow } from "./time.ts";

describe("istanbulDate", () => {
  it("UTC 21:00'den sonrası İstanbul'da ertesi gündür", () => {
    expect(istanbulDate(new Date("2026-11-16T22:30:00Z"))).toBe("2026-11-17");
  });

  it("UTC 20:59:59 İstanbul'da hâlâ aynı gündür", () => {
    expect(istanbulDate(new Date("2026-11-16T20:59:59Z"))).toBe("2026-11-16");
  });
});

describe("ratingWindow", () => {
  it("menü günü 11:30'da açılır, ertesi gün 11:30'da kapanır (İstanbul)", () => {
    const w = ratingWindow("2026-11-16");
    expect(w.opensAt.toISOString()).toBe("2026-11-16T08:30:00.000Z");
    expect(w.closesAt.toISOString()).toBe("2026-11-17T08:30:00.000Z");
  });

  it("ay ve yıl sonunu doğru geçer", () => {
    expect(ratingWindow("2026-12-31").closesAt.toISOString()).toBe("2027-01-01T08:30:00.000Z");
  });
});

describe("isRatingOpen", () => {
  const day = "2026-11-16";
  it.each([
    ["2026-11-16T08:29:59Z", false],
    ["2026-11-16T08:30:00Z", true],
    ["2026-11-17T08:29:59Z", true],
    ["2026-11-17T08:30:00Z", false],
  ])("%s → %s", (now, open) => {
    expect(isRatingOpen(day, new Date(now))).toBe(open);
  });
});
