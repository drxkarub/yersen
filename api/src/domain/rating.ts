import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { rating, swipe } from "../db/schema.ts";
import { consumeRate } from "./rateLimit.ts";
import { loadActorAndItem, upsertSwipe } from "./swipe.ts";
import { isRatingOpen } from "./time.ts";

export type RateResult =
  | { ok: true; ratingId: number }
  | { ok: false; error: "not_found" | "banned" | "invalid_score" | "window_closed" | "said_no" | "rate_limited" };

/**
 * CLAUDE.md "Kaydırma ve puanlama": 1-10 tam sayı; menü günü 11:30'dan ertesi gün 11:30'a kadar;
 * "yemem" diyen puanlayamaz; kaydırmamış kullanıcının kaydırması "yerim" yazılır;
 * kullanıcı-yemek-gün başına tek puan, pencere içinde değiştirilebilir.
 */
export async function rateDish(
  db: Db,
  input: { userId: string; menuItemId: number; score: number; now: Date },
): Promise<RateResult> {
  return db.transaction(async (tx): Promise<RateResult> => {
    const ctx = await loadActorAndItem(tx, input.userId, input.menuItemId);
    if (!ctx.ok) return { ok: false, error: ctx.error };
    const { item } = ctx;

    if (!Number.isInteger(input.score) || input.score < 1 || input.score > 10) return { ok: false, error: "invalid_score" };
    if (!isRatingOpen(item.date, input.now)) return { ok: false, error: "window_closed" };

    const [existing] = await tx
      .select({ choice: swipe.choice })
      .from(swipe)
      .where(and(eq(swipe.userId, input.userId), eq(swipe.menuItemId, item.id)));
    if (existing?.choice === "no") return { ok: false, error: "said_no" };

    if (!(await consumeRate(tx, input.userId, "rating", input.now))) return { ok: false, error: "rate_limited" };
    if (!existing) await upsertSwipe(tx, input.userId, item.id, "yes");

    const [row] = await tx
      .insert(rating)
      .values({ userId: input.userId, dishId: item.dishId, menuItemId: item.id, date: item.date, score: input.score })
      .onConflictDoUpdate({
        target: [rating.userId, rating.dishId, rating.date],
        set: { score: input.score, menuItemId: item.id, updatedAt: sql`now()` },
      })
      .returning({ id: rating.id });
    return { ok: true, ratingId: row!.id };
  });
}
