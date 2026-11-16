import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { dishKey } from "@yersen/shared";
import type { Db } from "../db/client.ts";
import { dish, menu, menuItem, swipe, venue } from "../db/schema.ts";

/** Scraper'ın MenuDay'i ile aynı yapı (döngüsel paket bağımlılığı olmasın diye burada tanımlı). */
export type StoredMenuDay = { date: string; dishes: string[]; kcal: number | null };

/**
 * Günlük menüleri idempotent kaydeder. Aynı veriyle tekrar çalışmak hiçbir şey çoğaltmaz.
 * Kalemin kimliği (menü, yemek) çiftidir: okul menüyü değiştirirse yeni yemek yeni kalem alır;
 * menüden düşen yemeğin kalemi silinir, kaydırması varsa negatif pozisyonda gizli tutulur
 * (okuyan sorgular position >= 0 süzmeli). Böylece bir "yerim" görülmemiş bir yemeğe geçmez.
 */
export async function storeMenuDays(
  db: Db,
  venueSlug: string,
  days: StoredMenuDay[],
): Promise<{ menus: number; items: number; newDishes: number }> {
  return db.transaction(async (tx) => {
    const [v] = await tx.select({ id: venue.id }).from(venue).where(eq(venue.slug, venueSlug));
    if (!v) throw new Error(`Yemek yeri bulunamadı: ${venueSlug}`);

    let items = 0;
    let newDishes = 0;

    for (const day of days) {
      const [m] = await tx
        .insert(menu)
        .values({ venueId: v.id, date: day.date, mealSlot: "daily", kcal: day.kcal, source: "scraper" })
        .onConflictDoUpdate({
          target: [menu.venueId, menu.date, menu.mealSlot],
          set: { kcal: day.kcal, updatedAt: sql`now()` },
        })
        .returning({ id: menu.id });

      // Aynı gün iki kez yazılan yemek: ilk geçen tutulur.
      const wanted: { key: string; raw: string }[] = [];
      for (const raw of day.dishes) {
        const key = dishKey(raw);
        if (key && !wanted.some((w) => w.key === key)) wanted.push({ key, raw: raw.trim() });
      }

      const dishIds: number[] = [];
      for (const w of wanted) {
        const inserted = await tx
          .insert(dish)
          .values({ key: w.key, displayName: w.raw })
          .onConflictDoNothing()
          .returning({ id: dish.id });
        if (inserted[0]) {
          newDishes++;
          dishIds.push(inserted[0].id);
        } else {
          const [found] = await tx
            .select({ id: dish.id })
            .from(dish)
            .where(and(eq(dish.key, w.key), isNull(dish.ownerVenueId)));
          dishIds.push(found!.id);
        }
      }

      const existing = await tx.select().from(menuItem).where(eq(menuItem.menuId, m!.id));
      // Önce hepsini benzersiz negatif pozisyonlara al: yeniden sıralamada tekillik çakışmasın.
      if (existing.length > 0) {
        await tx.update(menuItem).set({ position: sql`-${menuItem.id}` }).where(eq(menuItem.menuId, m!.id));
      }

      for (const [position, dishId] of dishIds.entries()) {
        const prev = existing.find((e) => e.dishId === dishId);
        if (prev) {
          await tx.update(menuItem).set({ position, rawName: wanted[position]!.raw }).where(eq(menuItem.id, prev.id));
        } else {
          await tx.insert(menuItem).values({ menuId: m!.id, dishId, position, rawName: wanted[position]!.raw });
        }
      }
      items += dishIds.length;

      const dropped = existing.filter((e) => !dishIds.includes(e.dishId)).map((e) => e.id);
      if (dropped.length > 0) {
        const swiped = await tx
          .selectDistinct({ id: swipe.menuItemId })
          .from(swipe)
          .where(inArray(swipe.menuItemId, dropped));
        const keep = new Set(swiped.map((s) => s.id));
        const deletable = dropped.filter((id) => !keep.has(id));
        if (deletable.length > 0) await tx.delete(menuItem).where(inArray(menuItem.id, deletable));
      }
    }

    return { menus: days.length, items, newDishes };
  });
}
