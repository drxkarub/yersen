import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { inviteCode, profile, rateEvent, rating, swipe, user } from "../db/schema.ts";

/**
 * Hesap silme (KVKK: silinmesini isteme hakkı). Google bilgisi (user + cascade session/account),
 * profil, kaydırmalar, puanlar ve oran olayları silinir. Davet ağacı kopmaz: davet ettiği kişilerin
 * "davet eden" alanı boşalır. Kullanmadığı kodlar silinir; kullandığı kodun "kullanan" bilgisi silinir
 * ama kullanım tarihi kalır (kod yeniden kullanılamaz). Yönetici hesabı silinemez.
 */
export async function deleteAccount(
  db: Db,
  input: { userId: string; confirmNickname: string },
): Promise<{ ok: true } | { ok: false; error: "confirm_mismatch" | "admin_cannot_delete" }> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select({ nickname: profile.nickname, role: profile.role }).from(profile).where(eq(profile.id, input.userId));
    if (p) {
      if (p.role === "admin") return { ok: false, error: "admin_cannot_delete" } as const;
      if (input.confirmNickname.trim().toLowerCase() !== p.nickname.toLowerCase()) return { ok: false, error: "confirm_mismatch" } as const;

      await tx.delete(swipe).where(eq(swipe.userId, input.userId));
      await tx.delete(rating).where(eq(rating.userId, input.userId));
      await tx.delete(rateEvent).where(eq(rateEvent.userId, input.userId));
      await tx.delete(inviteCode).where(and(eq(inviteCode.createdBy, input.userId), isNull(inviteCode.usedBy)));
      await tx.update(inviteCode).set({ createdBy: null }).where(eq(inviteCode.createdBy, input.userId));
      await tx.update(inviteCode).set({ usedBy: null, usedAt: sql`coalesce(${inviteCode.usedAt}, now())` }).where(eq(inviteCode.usedBy, input.userId));
      await tx.update(profile).set({ invitedBy: null }).where(eq(profile.invitedBy, input.userId));
      await tx.delete(profile).where(eq(profile.id, input.userId));
    }
    await tx.delete(user).where(eq(user.id, input.userId)); // session ve account cascade
    return { ok: true } as const;
  });
}
