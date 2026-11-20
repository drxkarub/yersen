import { and, asc, eq } from "drizzle-orm";
import type { DbOrTx } from "../db/client.ts";
import { profile, rating } from "../db/schema.ts";

export type DayRaters = { dishId: number; raters: { nickname: string | null; score: number }[] };

/**
 * Yalnızca admin: bir günün puanlarını kimin verdiği (hata avı için).
 * Diğer herkese puanlar yalnızca ortalama olarak görünür.
 */
export async function dayRaters(
  db: DbOrTx,
  input: { actorId: string; date: string },
): Promise<{ ok: true; dishes: DayRaters[] } | { ok: false; error: "forbidden" }> {
  const [me] = await db.select({ role: profile.role, bannedAt: profile.bannedAt }).from(profile).where(eq(profile.id, input.actorId));
  if (!me || me.bannedAt || me.role !== "admin") return { ok: false, error: "forbidden" };

  const rows = await db
    .select({ dishId: rating.dishId, nickname: profile.nickname, score: rating.score })
    .from(rating)
    .leftJoin(profile, eq(profile.id, rating.userId))
    .where(and(eq(rating.date, input.date)))
    .orderBy(asc(rating.dishId), asc(rating.createdAt), asc(rating.id));

  const byDish = new Map<number, DayRaters>();
  for (const r of rows) {
    const entry = byDish.get(r.dishId) ?? { dishId: r.dishId, raters: [] };
    entry.raters.push({ nickname: r.nickname, score: r.score });
    byDish.set(r.dishId, entry);
  }
  return { ok: true, dishes: [...byDish.values()] };
}
