import { and, asc, count, desc, eq, gt, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import type { DbOrTx } from "../db/client.ts";
import { dish, menu, menuItem, rating, swipe, venue } from "../db/schema.ts";
import { istanbulDate, isRatingOpen, ratingWindow } from "./time.ts";
import { trayPhotosByMenu } from "./trayPhotos.ts";

export type { DayMenuView, MenuItemView } from "@yersen/shared";
import { dishCategory, inDeck, type DayMenuView, type DayNavResponse } from "@yersen/shared";

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

  const rows = await db
    .select({
      menuId: menuItem.menuId,
      date: menu.date,
      menuItemId: menuItem.id,
      dishId: menuItem.dishId,
      rawName: menuItem.rawName,
      position: menuItem.position,
      imageUrl: dish.imageUrl,
      imageCredit: dish.imageCredit,
      imageSourceUrl: dish.imageSourceUrl,
      myChoice: swipe.choice,
      myScore: rating.score,
    })
    .from(menuItem)
    .innerJoin(menu, eq(menu.id, menuItem.menuId))
    .innerJoin(dish, eq(dish.id, menuItem.dishId))
    .leftJoin(swipe, and(eq(swipe.menuItemId, menuItem.id), eq(swipe.userId, userId)))
    .leftJoin(rating, and(eq(rating.dishId, menuItem.dishId), eq(rating.date, menu.date), eq(rating.userId, userId)))
    .where(and(inArray(menuItem.menuId, menus.map((m) => m.id)), visibleItems()))
    .orderBy(asc(menu.date), asc(menuItem.position));

  const trays = await trayPhotosByMenu(db, menus.map((m) => m.id));

  // Puanlar güne aittir: aynı yemek başka gün çıkınca o günün puanı boş başlar.
  // Önceki çıkışların ortalaması ayrı alan (kaydırırken karar vermeye yarar).
  const dishIds = [...new Set(rows.map((r) => r.dishId))];
  const perDay =
    dishIds.length === 0
      ? []
      : await db
          .select({ dishId: rating.dishId, date: rating.date, sum: sql<string>`sum(${rating.score})`, votes: count() })
          .from(rating)
          .where(inArray(rating.dishId, dishIds))
          .groupBy(rating.dishId, rating.date);
  const statsOf = (dishId: number, date: string) => {
    let daySum = 0, dayVotes = 0, pastSum = 0, pastVotes = 0;
    for (const p of perDay) {
      if (p.dishId !== dishId) continue;
      if (p.date === date) {
        daySum += Number(p.sum);
        dayVotes += p.votes;
      } else if (p.date < date) {
        pastSum += Number(p.sum);
        pastVotes += p.votes;
      }
    }
    const mean = (sum: number, n: number) => (n === 0 ? null : Math.round((sum / n) * 100) / 100);
    return { average: mean(daySum, dayVotes), votes: dayVotes, pastAverage: mean(pastSum, pastVotes), pastVotes };
  };

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
          category: dishCategory(r.rawName, r.position),
          inDeck: inDeck(r.rawName, r.position),
          imageUrl: r.imageUrl,
          imageCredit: r.imageCredit,
          imageSourceUrl: r.imageSourceUrl,
          ...statsOf(r.dishId, r.date),
          myChoice: r.myChoice ?? null,
          myScore: r.myScore ?? null,
        })),
      trayPhotos: trays.get(m.id) ?? [],
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

/** Bir gün ve ondan önceki/sonraki menülü gün (menüsüz günler atlanır). */
export async function getDayNav(
  db: DbOrTx,
  input: { date: string; userId: string; now: Date },
): Promise<DayNavResponse> {
  const neighbour = async (where: SQL, order: SQL) => {
    const [row] = await db
      .select({ date: menu.date })
      .from(menu)
      .innerJoin(venue, eq(venue.id, menu.venueId))
      .where(and(where, eq(venue.slug, DEFAULT_VENUE), eq(menu.mealSlot, "daily"), eq(menu.status, "published")))
      .orderBy(order)
      .limit(1);
    return row?.date ?? null;
  };
  const [day, prevDate, nextDate] = await Promise.all([
    getDayMenu(db, input),
    neighbour(lt(menu.date, input.date), desc(menu.date)),
    neighbour(gt(menu.date, input.date), asc(menu.date)),
  ]);
  return { date: input.date, today: istanbulDate(input.now), day, prevDate, nextDate };
}
