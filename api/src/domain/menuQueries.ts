import { and, asc, avg, count, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import type { DbOrTx } from "../db/client.ts";
import { dish, menu, menuItem, rating, swipe, venue } from "../db/schema.ts";
import { istanbulDate, isRatingOpen, ratingWindow } from "./time.ts";

export type { DayMenuView, MenuItemView } from "@yersen/shared";
import type { DayMenuView } from "@yersen/shared";

const DEFAULT_VENUE = "trakya-merkez";

/**
 * Görünür kalem koşulu: okuyan HER sorgu bunu kullanmalı. Menüden düşmüş ama kaydırması olduğu için
 * saklanan kalemler negatif pozisyondadır; yayınlanmamış (onay bekleyen) menüler de görünmez.
 */
export function visibleItems(): SQL {
  return and(gte(menuItem.position, 0), eq(menu.status, "published"))!;
}

async function loadDays(db: DbOrTx, where: SQL, userId: string, now: Date): Promise<DayMenuView[]> {
  const menus = await db
    .select({ id: menu.id, date: menu.date, kcal: menu.kcal })
    .from(menu)
    .innerJoin(venue, eq(venue.id, menu.venueId))
    .where(and(where, eq(venue.slug, DEFAULT_VENUE), eq(menu.mealSlot, "daily"), eq(menu.status, "published")))
    .orderBy(asc(menu.date));
  if (menus.length === 0) return [];

  const stats = db
    .select({ dishId: rating.dishId, average: avg(rating.score).as("average"), votes: count().as("votes") })
    .from(rating)
    .groupBy(rating.dishId)
    .as("stats");

  const rows = await db
    .select({
      menuId: menuItem.menuId,
      date: menu.date,
      menuItemId: menuItem.id,
      dishId: menuItem.dishId,
      rawName: menuItem.rawName,
      imageUrl: dish.imageUrl,
      imageCredit: dish.imageCredit,
      imageSourceUrl: dish.imageSourceUrl,
      average: stats.average,
      votes: stats.votes,
      myChoice: swipe.choice,
      myScore: rating.score,
    })
    .from(menuItem)
    .innerJoin(menu, eq(menu.id, menuItem.menuId))
    .innerJoin(dish, eq(dish.id, menuItem.dishId))
    .leftJoin(stats, eq(stats.dishId, menuItem.dishId))
    .leftJoin(swipe, and(eq(swipe.menuItemId, menuItem.id), eq(swipe.userId, userId)))
    .leftJoin(rating, and(eq(rating.dishId, menuItem.dishId), eq(rating.date, menu.date), eq(rating.userId, userId)))
    .where(and(inArray(menuItem.menuId, menus.map((m) => m.id)), visibleItems()))
    .orderBy(asc(menu.date), asc(menuItem.position));

  return menus.map((m) => {
    const { opensAt, closesAt } = ratingWindow(m.date);
    return {
      date: m.date,
      kcal: m.kcal,
      ratingOpen: isRatingOpen(m.date, now),
      opensAt: opensAt.toISOString(),
      closesAt: closesAt.toISOString(),
      items: rows
        .filter((r) => r.menuId === m.id)
        .map((r) => ({
          menuItemId: r.menuItemId,
          dishId: r.dishId,
          rawName: r.rawName,
          imageUrl: r.imageUrl,
          imageCredit: r.imageCredit,
          imageSourceUrl: r.imageSourceUrl,
          average: r.average === null ? null : Math.round(Number(r.average) * 100) / 100,
          votes: Number(r.votes ?? 0),
          myChoice: r.myChoice ?? null,
          myScore: r.myScore ?? null,
        })),
    };
  });
}

/** Bir günün menüsü; yoksa null. */
export async function getDayMenu(
  db: DbOrTx,
  input: { date: string; userId: string; now: Date },
): Promise<DayMenuView | null> {
  const [day] = await loadDays(db, eq(menu.date, input.date), input.userId, input.now);
  return day ?? null;
}

/** Bugün (İstanbul) ve sonrasındaki menülü günler. */
export function getUpcoming(db: DbOrTx, input: { userId: string; now: Date }): Promise<DayMenuView[]> {
  return loadDays(db, sql`${menu.date} >= ${istanbulDate(input.now)}`, input.userId, input.now);
}
