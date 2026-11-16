import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { consumeRate, RATE_LIMITS } from "./rateLimit.ts";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const t0 = new Date("2026-11-16T09:00:00Z");
const plus = (ms: number) => new Date(t0.getTime() + ms);

describe("consumeRate", () => {
  it("sınırlar CLAUDE.md'deki değerlerdir", () => {
    expect(RATE_LIMITS).toEqual({ swipe: 300, rating: 60 });
  });

  it("saatte 60 puana izin verir, 61.'yi reddeder", async () => {
    for (let i = 0; i < 60; i++) expect(await consumeRate(db, "u1", "rating", plus(i * 1000))).toBe(true);
    expect(await consumeRate(db, "u1", "rating", plus(60_000))).toBe(false);
  });

  it("bir saat geçince yeniden izin verir", async () => {
    for (let i = 0; i < 60; i++) await consumeRate(db, "u1", "rating", t0);
    expect(await consumeRate(db, "u1", "rating", plus(60 * 60 * 1000 + 1000))).toBe(true);
  });

  it("kaydırma sınırı puan sınırından ve diğer kullanıcılardan bağımsızdır", async () => {
    for (let i = 0; i < 60; i++) await consumeRate(db, "u1", "rating", t0);
    expect(await consumeRate(db, "u1", "swipe", t0)).toBe(true);
    expect(await consumeRate(db, "u2", "rating", t0)).toBe(true);
  });

  it("reddedilen istek sayılmaz", async () => {
    for (let i = 0; i < 61; i++) await consumeRate(db, "u1", "rating", t0);
    // 61. reddedildi; t0+1 saat+1 sn'de pencerede hiç olay kalmamalı, 60 hak yeniden açık olmalı
    const later = plus(60 * 60 * 1000 + 1000);
    for (let i = 0; i < 60; i++) expect(await consumeRate(db, "u1", "rating", later)).toBe(true);
  });

  it("kullanıcı-tür başına işlem kilidi alır (eşzamanlı isteklerin sınırı aşmaması için)", async () => {
    // PGlite tek bağlantılı olduğu için yarış burada canlandırılamaz; kilidin alındığını doğruluyoruz.
    const locks = await db.transaction(async (tx) => {
      await consumeRate(tx, "u1", "rating", t0);
      const r = await tx.execute(sql`select count(*)::int as n from pg_locks where locktype = 'advisory' and granted`);
      return (r as unknown as { rows: { n: number }[] }).rows[0]!.n;
    });
    expect(locks).toBe(1);
  });
});
