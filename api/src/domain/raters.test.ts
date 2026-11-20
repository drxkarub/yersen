import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { profile } from "../db/schema.ts";
import { NOW, setupWorld } from "../test/fixtures.ts";
import { rateDish } from "./rating.ts";
import { dayRaters } from "./raters.ts";

let db: Db;
let world: Awaited<ReturnType<typeof setupWorld>>;
beforeEach(async () => {
  db = await createTestDb();
  world = await setupWorld(db); // 15/16/17 Kasım; NOW = 16 Kasım 13:00
  await db.insert(profile).values([
    { id: "adm", nickname: "big_brother", role: "admin" },
    { id: "mod", nickname: "moddy", role: "moderator" },
    { id: "u3", nickname: "ecoo" },
  ]);
});

describe("dayRaters (yalnızca admin)", () => {
  it("günün her yemeği için kim kaç verdi; yalnızca o günün puanları", async () => {
    const nohut = await world.item("2026-11-16", "ETLİ NOHUT");
    await rateDish(db, { userId: "u1", menuItemId: nohut.id, score: 9, now: NOW });
    await rateDish(db, { userId: "u3", menuItemId: nohut.id, score: 4, now: NOW });
    const r = await dayRaters(db, { actorId: "adm", date: "2026-11-16" });
    expect(r).toEqual({
      ok: true,
      dishes: [{ dishId: nohut.dishId, raters: [{ nickname: "u1", score: 9 }, { nickname: "ecoo", score: 4 }] }],
    });
    expect(await dayRaters(db, { actorId: "adm", date: "2026-11-15" })).toEqual({ ok: true, dishes: [] });
  });

  it("moderatör ve normal kullanıcı göremez; banlı admin de", async () => {
    expect(await dayRaters(db, { actorId: "mod", date: "2026-11-16" })).toEqual({ ok: false, error: "forbidden" });
    expect(await dayRaters(db, { actorId: "u1", date: "2026-11-16" })).toEqual({ ok: false, error: "forbidden" });
    await db.update(profile).set({ bannedAt: NOW }).where(eq(profile.id, "adm"));
    expect(await dayRaters(db, { actorId: "adm", date: "2026-11-16" })).toEqual({ ok: false, error: "forbidden" });
  });
});
