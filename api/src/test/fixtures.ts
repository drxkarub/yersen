import { and, eq, gte } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { menu, menuItem, profile, rateEvent } from "../db/schema.ts";
import { storeMenuDays } from "../domain/menuStore.ts";

/** 16 Kasım 2026, 13:00 İstanbul: o günün puanlama penceresi açık. */
export const NOW = new Date("2026-11-16T10:00:00Z");

/** 15/16/17 Kasım menüleri, normal kullanıcı u1 ve banlı u2. Kalem kimliklerini tarih→ad ile döner. */
export async function setupWorld(db: Db) {
  await storeMenuDays(db, "trakya-merkez", [
    { date: "2026-11-15", dishes: ["MERCİMEK ÇORBA", "KÖFTE"], kcal: 800 },
    { date: "2026-11-16", dishes: ["DÜĞÜN ÇORBA", "ETLİ NOHUT"], kcal: 916 },
    { date: "2026-11-17", dishes: ["YAYLA ÇORBA", "TAVUK SOTE"], kcal: 850 },
  ]);
  await db.insert(profile).values([
    { id: "u1", nickname: "u1" },
    { id: "u2", nickname: "u2", bannedAt: new Date("2026-11-01T00:00:00Z") },
  ]);
  return {
    item: async (date: string, rawName: string) => {
      const [row] = await db
        .select({ id: menuItem.id, dishId: menuItem.dishId })
        .from(menuItem)
        .innerJoin(menu, eq(menu.id, menuItem.menuId))
        .where(and(eq(menu.date, date), eq(menuItem.rawName, rawName), gte(menuItem.position, 0)));
      if (!row) throw new Error(`kalem yok: ${date} ${rawName}`);
      return row;
    },
  };
}

/** Oran sınırını doldurur (count adet olayı now anına yazar). */
export async function fillRate(db: Db, userId: string, kind: "swipe" | "rating", count: number, now = NOW) {
  await db.insert(rateEvent).values(Array.from({ length: count }, () => ({ userId, kind, at: now })));
}
