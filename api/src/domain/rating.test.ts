import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "../db/client.ts";
import { rating, swipe } from "../db/schema.ts";
import { fillRate, NOW, setupWorld } from "../test/fixtures.ts";
import { rateDish } from "./rating.ts";
import { setSwipe } from "./swipe.ts";

let db: Db;
let world: Awaited<ReturnType<typeof setupWorld>>;
beforeEach(async () => {
  db = await createTestDb();
  world = await setupWorld(db);
});

const rate = (menuItemId: number, score: number, opts: { userId?: string; now?: Date } = {}) =>
  rateDish(db, { userId: opts.userId ?? "u1", menuItemId, score, now: opts.now ?? NOW });

describe("rateDish", () => {
  it.each(["yes", "maybe"] as const)("'%s' diyen pencere içinde puanlayabilir", async (choice) => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    await setSwipe(db, { userId: "u1", menuItemId: it.id, choice, now: NOW });
    const r = await rate(it.id, 8);
    expect(r.ok).toBe(true);
    const [row] = await db.select().from(rating);
    expect(row).toMatchObject({ userId: "u1", dishId: it.dishId, menuItemId: it.id, date: "2026-11-16", score: 8 });
  });

  it("pencere dışında window_closed döner", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    expect(await rate(it.id, 8, { now: new Date("2026-11-16T08:29:59Z") })).toEqual({ ok: false, error: "window_closed" });
    expect(await rate(it.id, 8, { now: new Date("2026-11-17T08:30:00Z") })).toEqual({ ok: false, error: "window_closed" });
    const tomorrow = await world.item("2026-11-17", "TAVUK SOTE");
    expect(await rate(tomorrow.id, 8)).toEqual({ ok: false, error: "window_closed" });
  });

  it("'yemem' diyen puanlayamaz; kararını 'yerim'e çevirince puanlayabilir", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    await setSwipe(db, { userId: "u1", menuItemId: it.id, choice: "no", now: NOW });
    expect(await rate(it.id, 8)).toEqual({ ok: false, error: "said_no" });
    await setSwipe(db, { userId: "u1", menuItemId: it.id, choice: "yes", now: NOW });
    expect((await rate(it.id, 8)).ok).toBe(true);
  });

  it("kaydırmamış kullanıcı puanlarsa kaydırması 'yerim' yazılır", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    expect((await rate(it.id, 6)).ok).toBe(true);
    const [s] = await db.select().from(swipe);
    expect(s).toMatchObject({ userId: "u1", menuItemId: it.id, choice: "yes" });
  });

  it.each([7.5, 0, 11, Number.NaN])("puan %s geçersizdir", async (score) => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    expect(await rate(it.id, score)).toEqual({ ok: false, error: "invalid_score" });
  });

  it("aynı puanı iki kez göndermek tek satır bırakır ve ikisi de başarılıdır", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    const a = await rate(it.id, 7);
    const b = await rate(it.id, 7);
    expect(a.ok && b.ok).toBe(true);
    expect(await db.$count(rating)).toBe(1);
  });

  it("puan değiştirilebilir", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    await rate(it.id, 4);
    await rate(it.id, 9);
    const rows = await db.select().from(rating);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.score).toBe(9);
  });

  it("saatte 60 puandan sonrası rate_limited", async () => {
    await fillRate(db, "u1", "rating", 60);
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    expect(await rate(it.id, 8)).toEqual({ ok: false, error: "rate_limited" });
    expect(await db.$count(rating)).toBe(0);
  });

  it("banlı kullanıcı puanlayamaz", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    expect(await rate(it.id, 8, { userId: "u2" })).toEqual({ ok: false, error: "banned" });
  });

  it("olmayan kalem not_found döner", async () => {
    expect(await rate(999_999, 8)).toEqual({ ok: false, error: "not_found" });
  });
});
