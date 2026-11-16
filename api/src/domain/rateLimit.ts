import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import type { DbOrTx } from "../db/client.ts";
import { rateEvent } from "../db/schema.ts";

/** Kullanıcı başına saatlik sınırlar (CLAUDE.md "Oran sınırı"). */
export const RATE_LIMITS = { swipe: 300, rating: 60 } as const;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Son bir saatte sınırın altındaysa olayı kaydeder ve true döner; değilse yazmadan false döner.
 * Bir saatten eski olaylar aynı çağrıda temizlenir. Çağıran, yazma işlemiyle aynı transaction'ı vermeli.
 */
export async function consumeRate(
  db: DbOrTx,
  userId: string,
  kind: keyof typeof RATE_LIMITS,
  now: Date,
): Promise<boolean> {
  // Aynı kullanıcı-tür için eşzamanlı istekleri sıraya sok: say-sonra-yaz arasında yarış olmasın.
  // Kilit transaction bitince kendiliğinden bırakılır; çağıran bir transaction içinde çağırmalı.
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`rate:${userId}:${kind}`}))`);
  const since = new Date(now.getTime() - WINDOW_MS);
  await db.delete(rateEvent).where(and(eq(rateEvent.userId, userId), lt(rateEvent.at, since)));
  const [row] = await db
    .select({ n: count() })
    .from(rateEvent)
    .where(and(eq(rateEvent.userId, userId), eq(rateEvent.kind, kind), gt(rateEvent.at, since)));
  if ((row?.n ?? 0) >= RATE_LIMITS[kind]) return false;
  await db.insert(rateEvent).values({ userId, kind, at: now });
  return true;
}
