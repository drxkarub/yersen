import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { asc, desc, eq, like } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { dishKey } from "@yersen/shared";
import type { Db, DbOrTx } from "../db/client.ts";
import { adminAction, dish, profile, scrapeRun } from "../db/schema.ts";
import { adminCreateCodes } from "./invites.ts";

// Yetki kuralları (CLAUDE.md "Yönetim ve roller"):
// - Moderatör atama/alma ve davet kodu üretme: yalnızca admin.
// - Admin rolü panelden değiştirilemez (yalnızca sunucuda set-role).
// - Yemek görseli ekleme/kaldırma: moderatör ve admin.

type Role = "user" | "moderator" | "admin";
type Forbidden = { ok: false; error: "forbidden" };

async function roleOf(db: DbOrTx, userId: string): Promise<Role | null> {
  const [p] = await db.select({ role: profile.role }).from(profile).where(eq(profile.id, userId));
  return p?.role ?? null;
}

async function log(
  db: DbOrTx,
  e: { actorId: string; action: string; targetType: string; targetId?: string | null; detail?: unknown },
) {
  await db.insert(adminAction).values({ ...e, targetId: e.targetId ?? null, detail: e.detail ?? null });
}

export async function listUsers(db: Db) {
  const inviter = alias(profile, "inviter");
  const rows = await db
    .select({
      id: profile.id,
      nickname: profile.nickname,
      role: profile.role,
      invitedBy: inviter.nickname,
      createdAt: profile.createdAt,
      bannedAt: profile.bannedAt,
    })
    .from(profile)
    .leftJoin(inviter, eq(inviter.id, profile.invitedBy))
    .orderBy(asc(profile.createdAt));
  return rows.map(({ bannedAt, ...r }) => ({ ...r, banned: bannedAt !== null }));
}

export async function setModerator(
  db: Db,
  input: { actorId: string; targetId: string; moderator: boolean },
): Promise<{ ok: true } | Forbidden | { ok: false; error: "not_found" | "cannot_change_admin" }> {
  return db.transaction(async (tx) => {
    if ((await roleOf(tx, input.actorId)) !== "admin") return { ok: false, error: "forbidden" } as const;
    const from = await roleOf(tx, input.targetId);
    if (!from) return { ok: false, error: "not_found" } as const;
    if (from === "admin") return { ok: false, error: "cannot_change_admin" } as const;
    const to: Role = input.moderator ? "moderator" : "user";
    if (from !== to) {
      await tx.update(profile).set({ role: to }).where(eq(profile.id, input.targetId));
      await log(tx, { actorId: input.actorId, action: "set_role", targetType: "profile", targetId: input.targetId, detail: { from, to } });
    }
    return { ok: true } as const;
  });
}

export async function adminCreateInvites(
  db: Db,
  input: { actorId: string; count: number },
): Promise<{ ok: true; codes: string[] } | Forbidden | { ok: false; error: "bad_count" }> {
  if ((await roleOf(db, input.actorId)) !== "admin") return { ok: false, error: "forbidden" };
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 20) return { ok: false, error: "bad_count" };
  const codes = await adminCreateCodes(db, input.count);
  await log(db, { actorId: input.actorId, action: "create_invites", targetType: "invite", detail: { count: input.count } });
  return { ok: true, codes };
}

export async function listDishes(db: Db, input: { q?: string }) {
  const q = input.q ? dishKey(input.q) : "";
  return db
    .select({
      id: dish.id,
      displayName: dish.displayName,
      imageUrl: dish.imageUrl,
      imageCredit: dish.imageCredit,
      imageSourceUrl: dish.imageSourceUrl,
      imageLocked: dish.imageLocked,
    })
    .from(dish)
    .where(q ? like(dish.key, `%${q.replace(/[%_\\]/g, "\\$&")}%`) : undefined)
    .orderBy(asc(dish.key))
    .limit(60);
}

const canEditImages = (r: Role | null) => r === "admin" || r === "moderator";

/**
 * Elle görsel: 800 px'e küçültülür, EXIF (konum, cihaz) silinir, JPEG'e çevrilir.
 * Dosya adı sürümlü (önbellek eski görseli göstermesin). Görsel kilitlenir: Commons dokunmaz.
 */
export async function setDishImage(
  db: Db,
  input: { actorId: string; dishId: number; bytes: Uint8Array; dir: string; now: Date },
): Promise<{ ok: true; imageUrl: string } | Forbidden | { ok: false; error: "not_found" | "invalid_image" }> {
  const [actor] = await db.select({ role: profile.role, nickname: profile.nickname }).from(profile).where(eq(profile.id, input.actorId));
  if (!canEditImages(actor?.role ?? null)) return { ok: false, error: "forbidden" };
  const [d] = await db.select({ id: dish.id }).from(dish).where(eq(dish.id, input.dishId));
  if (!d) return { ok: false, error: "not_found" };

  let out: Buffer;
  try {
    // sharp varsayılan olarak metadata yazmaz: EXIF/GPS çıktıya geçmez. rotate() yönü pikselle uygular.
    out = await sharp(input.bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 800, withoutEnlargement: false })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return { ok: false, error: "invalid_image" };
  }

  const file = `${d.id}-${input.now.getTime()}.jpg`;
  await writeFile(join(input.dir, file), out);
  const imageUrl = `/img/${file}`;
  await db
    .update(dish)
    .set({ imageUrl, imageCredit: `yersen, ${actor!.nickname}`, imageSourceUrl: null, imageLocked: true, imageCheckedAt: input.now })
    .where(eq(dish.id, d.id));
  await log(db, { actorId: input.actorId, action: "set_dish_image", targetType: "dish", targetId: String(d.id), detail: { imageUrl } });
  return { ok: true, imageUrl };
}

/** Görseli kaldırır: ön yüz ikon gösterir, Commons bir daha doldurmaz. */
export async function removeDishImage(
  db: Db,
  input: { actorId: string; dishId: number },
): Promise<{ ok: true } | Forbidden | { ok: false; error: "not_found" }> {
  if (!canEditImages(await roleOf(db, input.actorId))) return { ok: false, error: "forbidden" };
  const updated = await db
    .update(dish)
    .set({ imageUrl: null, imageCredit: null, imageSourceUrl: null, imageLocked: true })
    .where(eq(dish.id, input.dishId))
    .returning({ id: dish.id });
  if (updated.length === 0) return { ok: false, error: "not_found" };
  await log(db, { actorId: input.actorId, action: "remove_dish_image", targetType: "dish", targetId: String(input.dishId) });
  return { ok: true };
}

export async function recordScrapeRun(db: Db, run: { ok: boolean; message: string; at?: Date }) {
  await db.insert(scrapeRun).values({ ok: run.ok, message: run.message, at: run.at ?? new Date() });
}

export function recentScrapeRuns(db: Db, limit: number) {
  return db.select().from(scrapeRun).orderBy(desc(scrapeRun.at)).limit(limit);
}
