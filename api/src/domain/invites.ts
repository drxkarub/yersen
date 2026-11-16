import { randomInt } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db, DbOrTx } from "../db/client.ts";
import { inviteCode, profile } from "../db/schema.ts";

// 0/O ve 1/I gibi karıştırılan harfler yok: kod sesli okunup elle yazılabilsin.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const RESERVED = new Set(["admin", "yersen", "moderator", "mod", "root", "sistem", "yonetici", "yönetici"]);

export type NicknameCheck = { ok: true; nickname: string } | { ok: false };

/** 3-20 karakter; harf (Türkçe dahil), rakam, alt çizgi, nokta. Ayrılmış adlar alınamaz. */
export function validateNickname(input: string): NicknameCheck {
  const nickname = input.trim();
  if (!/^[\p{L}\p{N}_.]{3,20}$/u.test(nickname)) return { ok: false };
  if (!/[\p{L}\p{N}]/u.test(nickname)) return { ok: false };
  if (RESERVED.has(nickname.toLocaleLowerCase("tr-TR"))) return { ok: false };
  return { ok: true, nickname };
}

/** Kullanıcının yazdığı kodu karşılaştırılabilir hale getirir ("k7mx-q2pa" -> "K7MXQ2PA"). */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]+/g, "");
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

async function insertCodes(db: DbOrTx, createdBy: string | null, n: number): Promise<string[]> {
  const created: string[] = [];
  while (created.length < n) {
    const rows = await db
      .insert(inviteCode)
      .values({ code: generateCode(), createdBy })
      .onConflictDoNothing()
      .returning({ code: inviteCode.code });
    if (rows[0]) created.push(rows[0].code);
  }
  return created;
}

/** Yönetici kodları (davet ağacının kökü). */
export function adminCreateCodes(db: Db, n: number): Promise<string[]> {
  return insertCodes(db, null, n);
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; error: "already_onboarded" | "nickname_invalid" | "invalid_code" | "used_code" | "nickname_taken" };

/** İlk giriş: davet kodunu kullanır ve profili oluşturur. Hepsi tek transaction; hata olursa kod harcanmaz. */
export async function claimInvite(
  db: Db,
  input: { userId: string; code: string; nickname: string; now: Date },
): Promise<ClaimResult> {
  try {
    return await db.transaction(async (tx): Promise<ClaimResult> => {
      const [existing] = await tx.select({ id: profile.id }).from(profile).where(eq(profile.id, input.userId));
      if (existing) return { ok: false, error: "already_onboarded" };

      const nick = validateNickname(input.nickname);
      if (!nick.ok) return { ok: false, error: "nickname_invalid" };

      // Satır kilidi: aynı kodu iki kişi aynı anda kullanamasın.
      const [invite] = await tx
        .select()
        .from(inviteCode)
        .where(eq(inviteCode.code, normalizeCode(input.code)))
        .for("update");
      if (!invite) return { ok: false, error: "invalid_code" };
      if (invite.usedBy || invite.usedAt) return { ok: false, error: "used_code" }; // silinen hesabın kodu da harcanmış sayılır

      const [taken] = await tx
        .select({ n: count() })
        .from(profile)
        .where(eq(sql`lower(${profile.nickname})`, nick.nickname.toLowerCase()));
      if ((taken?.n ?? 0) > 0) return { ok: false, error: "nickname_taken" };

      await tx.insert(profile).values({ id: input.userId, nickname: nick.nickname, invitedBy: invite.createdBy });
      await tx.update(inviteCode).set({ usedBy: input.userId, usedAt: input.now }).where(eq(inviteCode.code, invite.code));
      return { ok: true };
    });
  } catch (err) {
    // Eşzamanlı aynı takma ad: tekillik indeksi yakalar.
    if (isUniqueViolation(err, "profile_nickname_lower_unique")) return { ok: false, error: "nickname_taken" };
    throw err;
  }
}

export type MyInvites = { codes: { code: string; usedBy: string | null }[] };

/** Kullanıcının davet kodları; eksikse kotaya tamamlar. usedBy: kullananın takma adı. */
export async function myInvites(db: Db, userId: string): Promise<MyInvites> {
  return db.transaction(async (tx) => {
    const [me] = await tx.select({ quota: profile.inviteQuota }).from(profile).where(eq(profile.id, userId)).for("update");
    if (!me) return { codes: [] };
    const [have] = await tx.select({ n: count() }).from(inviteCode).where(eq(inviteCode.createdBy, userId));
    const missing = me.quota - (have?.n ?? 0);
    if (missing > 0) await insertCodes(tx, userId, missing);

    const user = alias(profile, "used_by_profile");
    const rows = await tx
      .select({ code: inviteCode.code, usedBy: user.nickname })
      .from(inviteCode)
      .leftJoin(user, eq(user.id, inviteCode.usedBy))
      .where(and(eq(inviteCode.createdBy, userId)))
      .orderBy(asc(inviteCode.createdAt), asc(inviteCode.code))
      .limit(me.quota);
    return { codes: rows };
  });
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const c = e?.cause ?? e;
  return c?.code === "23505" && (c.constraint === constraint || String((c as Error).message ?? "").includes(constraint));
}
