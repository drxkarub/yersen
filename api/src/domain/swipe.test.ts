import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { menuItem, swipe } from "../db/schema.ts";
import { fillRate, NOW, setupWorld } from "../test/fixtures.ts";
import { setSwipe } from "./swipe.ts";

let db: Db;
let world: Awaited<ReturnType<typeof setupWorld>>;
beforeEach(async () => {
  db = await createTestDb();
  world = await setupWorld(db);
});

describe("setSwipe", () => {
  it("bugünün ve geleceğin kalemi kaydırılabilir", async () => {
    const today = await world.item("2026-11-16", "ETLİ NOHUT");
    const tomorrow = await world.item("2026-11-17", "TAVUK SOTE");
    expect(await setSwipe(db, { userId: "u1", menuItemId: today.id, choice: "yes", now: NOW })).toEqual({ ok: true });
    expect(await setSwipe(db, { userId: "u1", menuItemId: tomorrow.id, choice: "maybe", now: NOW })).toEqual({ ok: true });
  });

  it("geçmiş günün kalemi kaydırılamaz", async () => {
    const yesterday = await world.item("2026-11-15", "KÖFTE");
    expect(await setSwipe(db, { userId: "u1", menuItemId: yesterday.id, choice: "yes", now: NOW })).toEqual({ ok: false, error: "past_day" });
  });

  it("karar değiştirmek tek satırı günceller", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    await setSwipe(db, { userId: "u1", menuItemId: it.id, choice: "no", now: NOW });
    await setSwipe(db, { userId: "u1", menuItemId: it.id, choice: "yes", now: NOW });
    const rows = await db.select().from(swipe);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.choice).toBe("yes");
  });

  it("banlı kullanıcı kaydıramaz", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    expect(await setSwipe(db, { userId: "u2", menuItemId: it.id, choice: "yes", now: NOW })).toEqual({ ok: false, error: "banned" });
  });

  it("olmayan ya da gizlenmiş kalem not_found döner", async () => {
    expect(await setSwipe(db, { userId: "u1", menuItemId: 999_999, choice: "yes", now: NOW })).toEqual({ ok: false, error: "not_found" });
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    await db.update(menuItem).set({ position: -it.id }).where(eq(menuItem.id, it.id));
    expect(await setSwipe(db, { userId: "u1", menuItemId: it.id, choice: "yes", now: NOW })).toEqual({ ok: false, error: "not_found" });
  });

  it("profili olmayan kullanıcı not_found döner", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    expect(await setSwipe(db, { userId: "yok", menuItemId: it.id, choice: "yes", now: NOW })).toEqual({ ok: false, error: "not_found" });
  });

  it("saatte 300 kaydırmadan sonrası rate_limited", async () => {
    await fillRate(db, "u1", "swipe", 300);
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    expect(await setSwipe(db, { userId: "u1", menuItemId: it.id, choice: "yes", now: NOW })).toEqual({ ok: false, error: "rate_limited" });
    expect(await db.$count(swipe)).toBe(0);
  });
});
