import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { adminAction, dish, inviteCode, profile } from "../db/schema.ts";
import {
  adminCreateInvites,
  listDishes,
  listUsers,
  recordScrapeRun,
  recentScrapeRuns,
  removeDishImage,
  setDishImage,
  setModerator,
} from "./admin.ts";
import { fillDishImages } from "./dishImages.ts";

const NOW = new Date("2026-11-17T09:00:00Z");
let db: Db;
let dir: string;
beforeEach(async () => {
  db = await createTestDb();
  dir = mkdtempSync(join(tmpdir(), "yersen-adm-"));
  await db.insert(profile).values([
    { id: "adm", nickname: "big_brother", role: "admin" },
    { id: "mod", nickname: "moddy", role: "moderator", invitedBy: "adm" },
    { id: "u1", nickname: "ali", invitedBy: "adm" },
  ]);
});

const actions = async () => db.select().from(adminAction);

describe("listUsers", () => {
  it("takma ad, rol ve davet edenin takma adını döner; e-posta yok", async () => {
    const users = await listUsers(db);
    expect(users.find((u) => u.nickname === "ali")).toMatchObject({ id: "u1", role: "user", invitedBy: "big_brother", banned: false });
    expect(JSON.stringify(users)).not.toContain("@");
  });
});

describe("setModerator", () => {
  it("yönetici kullanıcıyı moderatör yapar ve kaydeder", async () => {
    expect(await setModerator(db, { actorId: "adm", targetId: "u1", moderator: true })).toEqual({ ok: true });
    const [p] = await db.select().from(profile).where(eq(profile.id, "u1"));
    expect(p?.role).toBe("moderator");
    expect(await actions()).toMatchObject([{ actorId: "adm", action: "set_role", targetType: "profile", targetId: "u1", detail: { from: "user", to: "moderator" } }]);
  });

  it("yönetici moderatörlüğü geri alır", async () => {
    expect(await setModerator(db, { actorId: "adm", targetId: "mod", moderator: false })).toEqual({ ok: true });
    const [p] = await db.select().from(profile).where(eq(profile.id, "mod"));
    expect(p?.role).toBe("user");
  });

  it("moderatör kimseyi moderatör yapamaz", async () => {
    expect(await setModerator(db, { actorId: "mod", targetId: "u1", moderator: true })).toEqual({ ok: false, error: "forbidden" });
    expect(await actions()).toEqual([]);
  });

  it("yöneticinin rolü panelden değiştirilemez", async () => {
    expect(await setModerator(db, { actorId: "adm", targetId: "adm", moderator: false })).toEqual({ ok: false, error: "cannot_change_admin" });
  });

  it("olmayan kullanıcı not_found", async () => {
    expect(await setModerator(db, { actorId: "adm", targetId: "yok", moderator: true })).toEqual({ ok: false, error: "not_found" });
  });
});

describe("adminCreateInvites", () => {
  it("yönetici kök davet kodu üretir ve kaydeder", async () => {
    const r = await adminCreateInvites(db, { actorId: "adm", count: 3 });
    expect(r.ok && r.codes).toHaveLength(3);
    const codes = await db.select().from(inviteCode);
    expect(codes.every((c) => c.createdBy === null)).toBe(true);
    expect((await actions())[0]).toMatchObject({ action: "create_invites", detail: { count: 3 } });
  });

  it("moderatör kod üretemez; sayı 1-20 arası", async () => {
    expect(await adminCreateInvites(db, { actorId: "mod", count: 1 })).toEqual({ ok: false, error: "forbidden" });
    expect(await adminCreateInvites(db, { actorId: "adm", count: 0 })).toEqual({ ok: false, error: "bad_count" });
    expect(await adminCreateInvites(db, { actorId: "adm", count: 21 })).toEqual({ ok: false, error: "bad_count" });
  });
});

describe("yemek görselleri", () => {
  async function jpegWithGps(): Promise<Uint8Array> {
    return new Uint8Array(
      await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#c8a060" } })
        .jpeg()
        .withExif({ IFD0: { Copyright: "GPS-TEST", Make: "Telefon" } })
        .toBuffer(),
    );
  }

  it("moderatör görsel yükler: küçültülür, EXIF silinir, kilitlenir, kaydedilir", async () => {
    const [d] = await db.insert(dish).values({ key: "spagetti napoliten", displayName: "SPAGETTİ NAPOLİTEN" }).returning();
    const r = await setDishImage(db, { actorId: "mod", dishId: d!.id, bytes: await jpegWithGps(), dir, now: NOW });
    expect(r.ok).toBe(true);
    const [row] = await db.select().from(dish).where(eq(dish.id, d!.id));
    expect(row).toMatchObject({ imageLocked: true, imageCredit: "yersen, moddy", imageSourceUrl: null });
    expect(row!.imageUrl).toMatch(new RegExp(`^/img/${d!.id}-\\d+\\.jpg$`));
    const file = readFileSync(join(dir, row!.imageUrl!.replace("/img/", "")));
    const meta = await sharp(file).metadata();
    expect(meta.width).toBe(800);
    expect(meta.exif).toBeUndefined();
    expect(file.includes("GPS-TEST")).toBe(false);
    expect((await actions())[0]).toMatchObject({ actorId: "mod", action: "set_dish_image", targetId: String(d!.id) });
  });

  it("normal kullanıcı görsel yükleyemez; resim olmayan dosya reddedilir", async () => {
    const [d] = await db.insert(dish).values({ key: "x", displayName: "X" }).returning();
    expect(await setDishImage(db, { actorId: "u1", dishId: d!.id, bytes: await jpegWithGps(), dir, now: NOW })).toEqual({ ok: false, error: "forbidden" });
    expect(await setDishImage(db, { actorId: "adm", dishId: d!.id, bytes: new TextEncoder().encode("resim değil"), dir, now: NOW })).toEqual({ ok: false, error: "invalid_image" });
    expect(await setDishImage(db, { actorId: "adm", dishId: 999, bytes: await jpegWithGps(), dir, now: NOW })).toEqual({ ok: false, error: "not_found" });
  });

  it("görseli kaldırınca ikon gösterilir ve Commons bir daha doldurmaz", async () => {
    const [d] = await db.insert(dish).values({ key: "erişte", displayName: "ERİŞTE", imageUrl: "/img/1.jpg", imageCredit: "x" }).returning();
    expect(await removeDishImage(db, { actorId: "mod", dishId: d!.id })).toEqual({ ok: true });
    const searched: string[] = [];
    await fillDishImages(db, { dir, now: NOW, search: async (q) => (searched.push(q), []), download: async () => new Uint8Array() });
    expect(searched).toEqual([]);
    const [row] = await db.select().from(dish).where(eq(dish.id, d!.id));
    expect(row).toMatchObject({ imageUrl: null, imageCredit: null, imageLocked: true });
  });

  it("listDishes ada göre arar (Türkçe büyük/küçük harf)", async () => {
    await db.insert(dish).values([
      { key: "etli nohut", displayName: "ETLİ NOHUT" },
      { key: "ezogelin çorba", displayName: "EZOGELİN ÇORBA" },
    ]);
    expect((await listDishes(db, { q: "NOHUT" })).map((d) => d.displayName)).toEqual(["ETLİ NOHUT"]);
    expect(await listDishes(db, {})).toHaveLength(2);
  });
});

describe("scraper çalışmaları", () => {
  it("son çalışmaları yeniden eskiye döner", async () => {
    await recordScrapeRun(db, { ok: true, message: "21 gün kaydedildi", at: new Date("2026-11-17T04:00:00Z") });
    await recordScrapeRun(db, { ok: false, message: "Sayfa yapısı değişti", at: new Date("2026-11-17T07:00:00Z") });
    const runs = await recentScrapeRuns(db, 5);
    expect(runs.map((r) => r.ok)).toEqual([false, true]);
  });
});
