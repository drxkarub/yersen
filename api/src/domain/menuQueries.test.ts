import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { menuItem, profile } from "../db/schema.ts";
import { NOW, setupWorld } from "../test/fixtures.ts";
import { getDayMenu, getDayNav, getUpcoming } from "./menuQueries.ts";
import { rateDish } from "./rating.ts";
import { setSwipe } from "./swipe.ts";

let db: Db;
let world: Awaited<ReturnType<typeof setupWorld>>;
beforeEach(async () => {
  db = await createTestDb();
  world = await setupWorld(db); // 15/16/17 Kasım; NOW = 16 Kasım 13:00
  await db.insert(profile).values([
    { id: "u3", nickname: "u3x" },
    { id: "u4", nickname: "u4x" },
  ]);
});

describe("getDayMenu", () => {
  it("menü yoksa null", async () => {
    expect(await getDayMenu(db, { date: "2026-11-21", userId: "u1", now: NOW })).toBeNull();
  });

  it("günün kalemlerini sırasıyla, kalori ve puanlama durumuyla döner", async () => {
    const day = await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW });
    expect(day).toMatchObject({ date: "2026-11-16", kcal: 916, ratingOpen: true });
    expect(day!.items.map((i) => i.rawName)).toEqual(["DÜĞÜN ÇORBA", "ETLİ NOHUT"]);
    expect(day!.items.map((i) => i.category)).toEqual(["corba", "ana"]);
    expect(day!.items.map((i) => i.inDeck)).toEqual([false, true]);
    expect(day!.items[0]).toMatchObject({ average: null, votes: 0, myChoice: null, myScore: null });
  });

  it("ortalama ve oy sayısı o günün puanlarından gelir", async () => {
    const nohut = await world.item("2026-11-16", "ETLİ NOHUT");
    await rateDish(db, { userId: "u1", menuItemId: nohut.id, score: 8, now: NOW });
    await rateDish(db, { userId: "u3", menuItemId: nohut.id, score: 6, now: NOW });
    const day = await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW });
    const item = day!.items.find((i) => i.rawName === "ETLİ NOHUT")!;
    expect(item).toMatchObject({ average: 7, votes: 2, myChoice: "yes", myScore: 8 });
  });

  it("aynı yemek başka gün çıkınca o günün puanı boş başlar; önceki çıkışlar ayrı alanda", async () => {
    const { storeMenuDays } = await import("./menuStore.ts");
    await storeMenuDays(db, "trakya-merkez", [{ date: "2026-11-18", dishes: ["ARPA ŞEHRİYE ÇORBA", "ETLİ NOHUT"], kcal: 900 }]);
    const nohut = await world.item("2026-11-16", "ETLİ NOHUT");
    await rateDish(db, { userId: "u1", menuItemId: nohut.id, score: 10, now: NOW });
    await rateDish(db, { userId: "u3", menuItemId: nohut.id, score: 6, now: NOW });

    const later = await getDayMenu(db, { date: "2026-11-18", userId: "u1", now: NOW });
    const again = later!.items.find((i) => i.rawName === "ETLİ NOHUT")!;
    expect(again).toMatchObject({ average: null, votes: 0, myScore: null, pastAverage: 8, pastVotes: 2 });
    expect(again.dishId).toBe(nohut.dishId); // görsel ortak kalır

    const today = await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW });
    expect(today!.items.find((i) => i.rawName === "ETLİ NOHUT")).toMatchObject({ average: 8, votes: 2, pastAverage: null, pastVotes: 0 });
  });

  it("başka kullanıcının kararı ve puanı görünmez", async () => {
    const nohut = await world.item("2026-11-16", "ETLİ NOHUT");
    await rateDish(db, { userId: "u3", menuItemId: nohut.id, score: 6, now: NOW });
    const day = await getDayMenu(db, { date: "2026-11-16", userId: "u4", now: NOW });
    expect(day!.items.find((i) => i.rawName === "ETLİ NOHUT")).toMatchObject({ myChoice: null, myScore: null, votes: 1 });
  });

  it("gizlenmiş kalem listelenmez", async () => {
    const nohut = await world.item("2026-11-16", "ETLİ NOHUT");
    await db.update(menuItem).set({ position: -nohut.id }).where(eq(menuItem.id, nohut.id));
    const day = await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW });
    expect(day!.items.map((i) => i.rawName)).toEqual(["DÜĞÜN ÇORBA"]);
  });

  it("puanlama penceresi açılmadıysa ratingOpen false ve opensAt verilir", async () => {
    const day = await getDayMenu(db, { date: "2026-11-17", userId: "u1", now: NOW });
    expect(day).toMatchObject({ ratingOpen: false, opensAt: "2026-11-17T08:30:00.000Z" });
  });
});

describe("getUpcoming", () => {
  it("bugün ve sonrasındaki günleri tarih sırasıyla, kararlarla döner; geçmişi dönmez", async () => {
    const sote = await world.item("2026-11-17", "TAVUK SOTE");
    await setSwipe(db, { userId: "u1", menuItemId: sote.id, choice: "no", now: NOW });
    const days = await getUpcoming(db, { userId: "u1", now: NOW });
    expect(days.map((d) => d.date)).toEqual(["2026-11-16", "2026-11-17"]);
    expect(days[1]!.items.find((i) => i.rawName === "TAVUK SOTE")?.myChoice).toBe("no");
  });
});

describe("getDayNav", () => {
  it("günün menüsünü ve menülü komşu günleri döner", async () => {
    const nav = await getDayNav(db, { date: "2026-11-16", userId: "u1", now: NOW });
    expect(nav).toMatchObject({ date: "2026-11-16", today: "2026-11-16", prevDate: "2026-11-15", nextDate: "2026-11-17" });
    expect(nav.day?.items).toHaveLength(2);
  });

  it("ilk günde geri, son günde ileri yok", async () => {
    expect(await getDayNav(db, { date: "2026-11-15", userId: "u1", now: NOW })).toMatchObject({ prevDate: null, nextDate: "2026-11-16" });
    expect(await getDayNav(db, { date: "2026-11-17", userId: "u1", now: NOW })).toMatchObject({ prevDate: "2026-11-16", nextDate: null });
  });

  it("menüsüz günde (hafta sonu) day null; komşular menülü günlerden, aradaki boş günler atlanır", async () => {
    const nav = await getDayNav(db, { date: "2026-11-21", userId: "u1", now: NOW });
    expect(nav).toMatchObject({ day: null, prevDate: "2026-11-17", nextDate: null });
  });
});
