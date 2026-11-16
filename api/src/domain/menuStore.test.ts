import { beforeEach, describe, expect, it } from "vitest";
import { and, asc, eq, gte } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { dish, menu, menuItem, profile, rating, swipe } from "../db/schema.ts";
import { storeMenuDays, type StoredMenuDay } from "./menuStore.ts";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const day16: StoredMenuDay = { date: "2026-11-16", dishes: ["DÜĞÜN ÇORBA", "ETLİ NOHUT", "PİRİNÇ PİLAVI", "YOĞURT"], kcal: 916 };
const day17: StoredMenuDay = { date: "2026-11-17", dishes: ["DÜĞÜN ÇORBA", "TAVUK SOTE", "BULGUR PİLAVI", "AYRAN"], kcal: 850 };

async function visibleDishNames(date: string) {
  const rows = await db
    .select({ name: menuItem.rawName })
    .from(menuItem)
    .innerJoin(menu, eq(menu.id, menuItem.menuId))
    .where(and(eq(menu.date, date), gte(menuItem.position, 0)))
    .orderBy(asc(menuItem.position));
  return rows.map((r) => r.name);
}

describe("storeMenuDays", () => {
  it("ilk kayıt menü, kalem ve yemekleri oluşturur; ortak yemek bir kez oluşur", async () => {
    const r = await storeMenuDays(db, "trakya-merkez", [day16, day17]);
    expect(r).toEqual({ menus: 2, items: 8, newDishes: 7 });
    expect(await db.$count(dish)).toBe(7);
    expect(await visibleDishNames("2026-11-17")).toEqual(day17.dishes);
  });

  it("aynı veriyle ikinci çalıştırma hiçbir şey çoğaltmaz", async () => {
    await storeMenuDays(db, "trakya-merkez", [day16, day17]);
    const r = await storeMenuDays(db, "trakya-merkez", [day16, day17]);
    expect(r.newDishes).toBe(0);
    expect(await db.$count(menu)).toBe(2);
    expect(await db.$count(menuItem)).toBe(8);
    expect(await db.$count(dish)).toBe(7);
  });

  it("görünen ad menüdeki ham addır, anahtar dishKey'dir", async () => {
    await storeMenuDays(db, "trakya-merkez", [day16]);
    const [d] = await db.select().from(dish).where(eq(dish.key, "pirinç pilavı"));
    expect(d?.displayName).toBe("PİRİNÇ PİLAVI");
  });

  it("okul menüyü değiştirirse yeni yemek görünür, eski puan eski yemekte kalır, kaydırma yeni yemeğe geçmez", async () => {
    await storeMenuDays(db, "trakya-merkez", [day16]);
    const [nohut] = await db.select().from(menuItem).where(eq(menuItem.rawName, "ETLİ NOHUT"));
    await db.insert(profile).values({ id: "u1", nickname: "a" });
    await db.insert(swipe).values({ userId: "u1", menuItemId: nohut!.id, choice: "yes" });
    await db.insert(rating).values({ userId: "u1", dishId: nohut!.dishId, menuItemId: nohut!.id, date: "2026-11-16", score: 8 });

    await storeMenuDays(db, "trakya-merkez", [{ ...day16, dishes: ["DÜĞÜN ÇORBA", "KURU FASULYE", "PİRİNÇ PİLAVI", "YOĞURT"] }]);

    expect(await visibleDishNames("2026-11-16")).toEqual(["DÜĞÜN ÇORBA", "KURU FASULYE", "PİRİNÇ PİLAVI", "YOĞURT"]);
    const [kept] = await db.select().from(menuItem).where(eq(menuItem.id, nohut!.id));
    expect(kept?.dishId).toBe(nohut!.dishId); // kaydırılan kalem hâlâ nohuta ait (gizli)
    expect(kept!.position).toBeLessThan(0);
    const [r] = await db.select().from(rating);
    expect(r?.dishId).toBe(nohut!.dishId);
  });

  it("kaydırması olmayan düşen kalem silinir", async () => {
    await storeMenuDays(db, "trakya-merkez", [day16]);
    await storeMenuDays(db, "trakya-merkez", [{ ...day16, dishes: ["DÜĞÜN ÇORBA", "ETLİ NOHUT"] }]);
    expect(await db.$count(menuItem)).toBe(2);
  });

  it("aynı gün iki kez yazılan yemek bir kez kaydedilir", async () => {
    const r = await storeMenuDays(db, "trakya-merkez", [{ date: "2026-11-18", dishes: ["AYRAN", "KÖFTE", "ayran "], kcal: null }]);
    expect(r.items).toBe(2);
    expect(await visibleDishNames("2026-11-18")).toEqual(["AYRAN", "KÖFTE"]);
  });

  it("kalori güncellenir", async () => {
    await storeMenuDays(db, "trakya-merkez", [day16]);
    await storeMenuDays(db, "trakya-merkez", [{ ...day16, kcal: 1000 }]);
    const [m] = await db.select().from(menu);
    expect(m?.kcal).toBe(1000);
  });

  it("bilinmeyen yemek yeri hata verir", async () => {
    await expect(storeMenuDays(db, "yok-boyle-bir-yer", [day16])).rejects.toThrow(/yok-boyle-bir-yer/);
  });
});
