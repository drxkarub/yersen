import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { adminAction, profile, trayPhoto } from "../db/schema.ts";
import { NOW, setupWorld } from "../test/fixtures.ts";
import { getDayMenu } from "./menuQueries.ts";
import { addTrayPhoto, MAX_TRAY_PHOTOS, removeTrayPhoto } from "./trayPhotos.ts";

let db: Db;
let dir: string;
beforeEach(async () => {
  db = await createTestDb();
  dir = mkdtempSync(join(tmpdir(), "yersen-tray-"));
  await setupWorld(db); // 15/16/17 Kasım; NOW = 16 Kasım 13:00; u1 normal, u2 banlı
  await db.insert(profile).values([
    { id: "adm", nickname: "big_brother", role: "admin" },
    { id: "mod", nickname: "moddy", role: "moderator" },
  ]);
});

// GPS'li, 3000 px'lik bir telefon fotoğrafı gibi.
const phoneJpeg = () =>
  sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#aa8844" } })
    .withExif({ IFD0: { Make: "Telefon" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "41/1 40/1 0/1" } })
    .jpeg()
    .toBuffer()
    .then((b) => new Uint8Array(b));

const add = async (actorId: string, date = "2026-11-16", bytes?: Uint8Array) =>
  addTrayPhoto(db, { actorId, date, bytes: bytes ?? (await phoneJpeg()), dir, now: NOW });

describe("addTrayPhoto", () => {
  it("moderatör yükler: küçültülür, EXIF/GPS silinir, dosya yazılır, işlem kaydedilir", async () => {
    const r = await add("mod");
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.url).toMatch(/^\/img\/tray-\d+-\d+-[a-z0-9]+\.jpg$/);
    const file = join(dir, r.url.slice("/img/".length));
    const meta = await sharp(readFileSync(file)).metadata();
    expect(meta.width).toBe(1280);
    expect(meta.exif).toBeUndefined();
    expect(await db.select({ action: adminAction.action }).from(adminAction)).toEqual([{ action: "add_tray_photo" }]);
  });

  it("admin de yükler; normal ve banlı kullanıcı yükleyemez", async () => {
    expect((await add("adm")).ok).toBe(true);
    expect(await add("u1")).toEqual({ ok: false, error: "forbidden" });
    await db.update(profile).set({ bannedAt: NOW }).where(eq(profile.id, "mod"));
    expect(await add("mod")).toEqual({ ok: false, error: "forbidden" });
  });

  it("menüsü olmayan gün not_found, ileriki gün future_day", async () => {
    expect(await add("mod", "2026-11-21")).toEqual({ ok: false, error: "not_found" });
    expect(await add("mod", "2026-11-17")).toEqual({ ok: false, error: "future_day" });
  });

  it("geçmiş güne de yüklenebilir (akşam unutulduysa)", async () => {
    expect((await add("mod", "2026-11-15")).ok).toBe(true);
  });

  it(`bir güne en fazla ${MAX_TRAY_PHOTOS} fotoğraf`, async () => {
    const img = await phoneJpeg();
    for (let i = 0; i < MAX_TRAY_PHOTOS; i++) expect((await add("mod", "2026-11-16", img)).ok).toBe(true);
    expect(await add("mod", "2026-11-16", img)).toEqual({ ok: false, error: "too_many_photos" });
  });

  it("resim olmayan dosya invalid_image; kayıt oluşmaz", async () => {
    expect(await add("mod", "2026-11-16", new TextEncoder().encode("resim değil"))).toEqual({ ok: false, error: "invalid_image" });
    expect(await db.$count(trayPhoto)).toBe(0);
  });
});

describe("removeTrayPhoto", () => {
  it("moderatör kaldırır: kayıt ve dosya silinir", async () => {
    const r = await add("adm");
    if (!r.ok) throw new Error("yüklenemedi");
    const file = join(dir, r.url.slice("/img/".length));
    expect(await removeTrayPhoto(db, { actorId: "u1", photoId: r.id, dir })).toEqual({ ok: false, error: "forbidden" });
    expect(await removeTrayPhoto(db, { actorId: "mod", photoId: r.id, dir })).toEqual({ ok: true });
    expect(existsSync(file)).toBe(false);
    expect(await db.$count(trayPhoto)).toBe(0);
    expect(await removeTrayPhoto(db, { actorId: "mod", photoId: r.id, dir })).toEqual({ ok: false, error: "not_found" });
  });
});

describe("günün menüsünde tepsi fotoğrafları", () => {
  it("fotoğraf yoksa boş liste", async () => {
    expect((await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW }))!.trayPhotos).toEqual([]);
  });

  it("yükleme sırasıyla, yükleyenin takma adıyla; hesabı silinen yükleyici null", async () => {
    const a = await add("mod");
    const b = await add("adm");
    if (!a.ok || !b.ok) throw new Error("yüklenemedi");
    const day = await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW });
    expect(day!.trayPhotos).toEqual([
      { id: a.id, url: a.url, uploadedBy: "moddy" },
      { id: b.id, url: b.url, uploadedBy: "big_brother" },
    ]);
    expect((await getDayMenu(db, { date: "2026-11-15", userId: "u1", now: NOW }))!.trayPhotos).toEqual([]);
    await db.delete(profile).where(eq(profile.id, "mod"));
    expect((await getDayMenu(db, { date: "2026-11-16", userId: "u1", now: NOW }))!.trayPhotos[0]!.uploadedBy).toBeNull();
  });
});
