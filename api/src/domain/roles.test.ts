import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { profile } from "../db/schema.ts";
import { setRole } from "./roles.ts";

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(profile).values({ id: "u1", nickname: "big_brother" });
});

describe("setRole", () => {
  it("takma adla (büyük/küçük harf duyarsız) rol verir", async () => {
    expect(await setRole(db, "Big_Brother", "admin")).toEqual({ ok: true, userId: "u1", previous: "user" });
    const [p] = await db.select().from(profile).where(eq(profile.id, "u1"));
    expect(p?.role).toBe("admin");
  });

  it("olmayan takma ad not_found", async () => {
    expect(await setRole(db, "yok", "moderator")).toEqual({ ok: false, error: "not_found" });
  });
});
