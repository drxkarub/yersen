import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "./client.ts";
import { dish, menu, menuItem, profile, rating, venue } from "./schema.ts";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

async function seedRatingContext() {
  const [v] = await db.select().from(venue).where(eq(venue.slug, "trakya-merkez"));
  const [d] = await db.insert(dish).values({ key: "etli nohut", displayName: "ETLİ NOHUT" }).returning();
  const [m] = await db.insert(menu).values({ venueId: v!.id, date: "2026-11-16", source: "scraper" }).returning();
  const [item] = await db.insert(menuItem).values({ menuId: m!.id, dishId: d!.id, position: 0, rawName: "ETLİ NOHUT" }).returning();
  await db.insert(profile).values({ id: "u1", nickname: "Burak" });
  return { dishId: d!.id, menuItemId: item!.id };
}

describe("şema", () => {
  it("tohum yemekhane satırı var", async () => {
    const rows = await db.select().from(venue).where(eq(venue.slug, "trakya-merkez"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "cafeteria", city: "Edirne", university: "trakya" });
  });

  it("puan 1-10 dışında reddedilir", async () => {
    const { dishId, menuItemId } = await seedRatingContext();
    for (const score of [0, 11]) {
      await expect(
        db.insert(rating).values({ userId: "u1", dishId, menuItemId, date: "2026-11-16", score }),
      ).rejects.toThrow();
    }
  });

  it("aynı kullanıcı-yemek-gün için ikinci puan reddedilir", async () => {
    const { dishId, menuItemId } = await seedRatingContext();
    const row = { userId: "u1", dishId, menuItemId, date: "2026-11-16", score: 7 };
    await db.insert(rating).values(row);
    await expect(db.insert(rating).values({ ...row, score: 8 })).rejects.toThrow();
  });

  it("takma ad büyük/küçük harf duyarsız tekil", async () => {
    await db.insert(profile).values({ id: "u1", nickname: "Burak" });
    await expect(db.insert(profile).values({ id: "u2", nickname: "burak" })).rejects.toThrow();
  });

  it("sahipsiz aynı anahtarlı iki yemek reddedilir", async () => {
    await db.insert(dish).values({ key: "etli nohut", displayName: "ETLİ NOHUT" });
    await expect(db.insert(dish).values({ key: "etli nohut", displayName: "Etli Nohut" })).rejects.toThrow();
  });
});
