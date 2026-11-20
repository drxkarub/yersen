import { randomBytes } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { TrayPhotoView } from "@yersen/shared";
import type { Db, DbOrTx } from "../db/client.ts";
import { adminAction, menu, profile, trayPhoto, venue } from "../db/schema.ts";
import { istanbulDate } from "./time.ts";

// Tepsi fotoğrafı: günün gerçek tepsisi. Yalnızca moderatör ve admin yükler/kaldırır
// (CLAUDE.md "Yönetim ve roller"). Yüklenmemişse ön yüzde hiç görünmez.

export const MAX_TRAY_PHOTOS = 6;
const DEFAULT_VENUE = "trakya-merkez";

type Forbidden = { ok: false; error: "forbidden" };

async function staffActor(db: DbOrTx, userId: string) {
  const [p] = await db.select({ role: profile.role, bannedAt: profile.bannedAt }).from(profile).where(eq(profile.id, userId));
  return p && !p.bannedAt && (p.role === "admin" || p.role === "moderator");
}

export async function addTrayPhoto(
  db: Db,
  input: { actorId: string; date: string; bytes: Uint8Array; dir: string; now: Date },
): Promise<
  | { ok: true; id: number; url: string }
  | Forbidden
  | { ok: false; error: "not_found" | "future_day" | "too_many_photos" | "invalid_image" }
> {
  if (!(await staffActor(db, input.actorId))) return { ok: false, error: "forbidden" };
  const [m] = await db
    .select({ id: menu.id })
    .from(menu)
    .innerJoin(venue, eq(venue.id, menu.venueId))
    .where(and(eq(menu.date, input.date), eq(venue.slug, DEFAULT_VENUE), eq(menu.mealSlot, "daily"), eq(menu.status, "published")));
  if (!m) return { ok: false, error: "not_found" };
  if (input.date > istanbulDate(input.now)) return { ok: false, error: "future_day" }; // yarının tepsisi henüz yok
  const [{ n }] = (await db.select({ n: count() }).from(trayPhoto).where(eq(trayPhoto.menuId, m.id))) as [{ n: number }];
  if (n >= MAX_TRAY_PHOTOS) return { ok: false, error: "too_many_photos" };

  let out: Buffer;
  try {
    // sharp varsayılan olarak metadata yazmaz: EXIF/GPS çıktıya geçmez. rotate() yönü pikselle uygular.
    out = await sharp(input.bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1280, withoutEnlargement: false })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    return { ok: false, error: "invalid_image" };
  }

  // Tahmin edilemez ad: yüklenmemiş/kaldırılmış fotoğraf adresi sayılarak bulunamasın.
  const file = `tray-${m.id}-${input.now.getTime()}-${randomBytes(6).toString("hex")}.jpg`;
  await writeFile(join(input.dir, file), out);
  const [row] = await db.insert(trayPhoto).values({ menuId: m.id, file, uploadedBy: input.actorId }).returning({ id: trayPhoto.id });
  await db.insert(adminAction).values({
    actorId: input.actorId,
    action: "add_tray_photo",
    targetType: "menu",
    targetId: String(m.id),
    detail: { file },
  });
  return { ok: true, id: row!.id, url: `/img/${file}` };
}

/** Kaydı ve dosyayı siler. */
export async function removeTrayPhoto(
  db: Db,
  input: { actorId: string; photoId: number; dir: string },
): Promise<{ ok: true } | Forbidden | { ok: false; error: "not_found" }> {
  if (!(await staffActor(db, input.actorId))) return { ok: false, error: "forbidden" };
  const [row] = await db.delete(trayPhoto).where(eq(trayPhoto.id, input.photoId)).returning({ file: trayPhoto.file, menuId: trayPhoto.menuId });
  if (!row) return { ok: false, error: "not_found" };
  await unlink(join(input.dir, row.file)).catch(() => {}); // dosya zaten yoksa sorun değil
  await db.insert(adminAction).values({
    actorId: input.actorId,
    action: "remove_tray_photo",
    targetType: "menu",
    targetId: String(row.menuId),
    detail: { file: row.file },
  });
  return { ok: true };
}

/** Menülerin tepsi fotoğrafları, yükleme sırasıyla. */
export async function trayPhotosByMenu(db: DbOrTx, menuIds: number[]): Promise<Map<number, TrayPhotoView[]>> {
  const out = new Map<number, TrayPhotoView[]>();
  if (menuIds.length === 0) return out;
  const rows = await db
    .select({ id: trayPhoto.id, menuId: trayPhoto.menuId, file: trayPhoto.file, uploadedBy: profile.nickname })
    .from(trayPhoto)
    .leftJoin(profile, eq(profile.id, trayPhoto.uploadedBy))
    .where(inArray(trayPhoto.menuId, menuIds))
    .orderBy(asc(trayPhoto.createdAt), asc(trayPhoto.id));
  for (const r of rows) {
    const list = out.get(r.menuId) ?? [];
    list.push({ id: r.id, url: `/img/${r.file}`, uploadedBy: r.uploadedBy ?? null });
    out.set(r.menuId, list);
  }
  return out;
}
