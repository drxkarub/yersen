import { and, eq, gte, sql } from "drizzle-orm";
import type { Db, Tx } from "../db/client.ts";
import { menu, menuItem, profile, swipe } from "../db/schema.ts";
import { consumeRate } from "./rateLimit.ts";
import { istanbulDate, isRatingOpen } from "./time.ts";

export type SwipeChoice = "yes" | "no" | "maybe";
export type SwipeResult = { ok: true } | { ok: false; error: "not_found" | "banned" | "past_day" | "rate_limited" };

/** Kullanıcıyı ve görünür kalemi (menü tarihiyle) yükler; ortak ön kontroller. */
export async function loadActorAndItem(tx: Tx, userId: string, menuItemId: number) {
  const [actor] = await tx.select({ bannedAt: profile.bannedAt }).from(profile).where(eq(profile.id, userId));
  if (!actor) return { ok: false as const, error: "not_found" as const };
  if (actor.bannedAt) return { ok: false as const, error: "banned" as const };
  const [item] = await tx
    .select({ id: menuItem.id, dishId: menuItem.dishId, date: menu.date })
    .from(menuItem)
    .innerJoin(menu, eq(menu.id, menuItem.menuId))
    .where(and(eq(menuItem.id, menuItemId), gte(menuItem.position, 0), eq(menu.status, "published")));
  if (!item) return { ok: false as const, error: "not_found" as const };
  return { ok: true as const, item };
}

export async function setSwipe(
  db: Db,
  input: { userId: string; menuItemId: number; choice: SwipeChoice; now: Date },
): Promise<SwipeResult> {
  return db.transaction(async (tx): Promise<SwipeResult> => {
    const ctx = await loadActorAndItem(tx, input.userId, input.menuItemId);
    if (!ctx.ok) return { ok: false, error: ctx.error };
    // Geçmiş gün kapalıdır; ama puanlama penceresi (ertesi gün 11:30'a kadar) açıksa karar değiştirilebilir,
    // yoksa akşam "aslında yedim" diyen biri sabaha kadar puanlayamaz.
    if (ctx.item.date < istanbulDate(input.now) && !isRatingOpen(ctx.item.date, input.now)) {
      return { ok: false, error: "past_day" };
    }
    if (!(await consumeRate(tx, input.userId, "swipe", input.now))) return { ok: false, error: "rate_limited" };
    await upsertSwipe(tx, input.userId, input.menuItemId, input.choice);
    return { ok: true };
  });
}

export async function upsertSwipe(tx: Tx, userId: string, menuItemId: number, choice: SwipeChoice) {
  await tx
    .insert(swipe)
    .values({ userId, menuItemId, choice })
    .onConflictDoUpdate({ target: [swipe.userId, swipe.menuItemId], set: { choice, updatedAt: sql`now()` } });
}
