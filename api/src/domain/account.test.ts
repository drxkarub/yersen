import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { account, inviteCode, profile, rating, session, swipe, user } from "../db/schema.ts";
import { NOW, setupWorld } from "../test/fixtures.ts";
import { deleteAccount } from "./account.ts";
import { adminCreateCodes, claimInvite, myInvites } from "./invites.ts";
import { rateDish } from "./rating.ts";

let db: Db;
let world: Awaited<ReturnType<typeof setupWorld>>;
let rootCode: string;
beforeEach(async () => {
  db = await createTestDb();
  world = await setupWorld(db);
  // Gerçek akıştaki gibi: Better Auth kullanıcısı + oturum + hesap, sonra davetle profil.
  await db.insert(user).values({ id: "g1", name: "Gerçek Ad", email: "g1@example.com" });
  await db.insert(session).values({ id: "s1", token: "t1", userId: "g1", expiresAt: new Date("2027-01-01") });
  await db.insert(account).values({ id: "a1", accountId: "google-1", providerId: "google", userId: "g1" });
  rootCode = (await adminCreateCodes(db, 1))[0]!;
  await claimInvite(db, { userId: "g1", code: rootCode, nickname: "silinecek", now: NOW });
});

describe("deleteAccount", () => {
  it("Google bilgisi, oturum, profil, kaydırma ve puanları siler", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    await rateDish(db, { userId: "g1", menuItemId: it.id, score: 9, now: NOW });

    expect(await deleteAccount(db, { userId: "g1", confirmNickname: "Silinecek" })).toEqual({ ok: true });

    expect(await db.select().from(user).where(eq(user.id, "g1"))).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, "g1"))).toEqual([]);
    expect(await db.select().from(account).where(eq(account.userId, "g1"))).toEqual([]);
    expect(await db.select().from(profile).where(eq(profile.id, "g1"))).toEqual([]);
    expect(await db.select().from(swipe).where(eq(swipe.userId, "g1"))).toEqual([]);
    expect(await db.select().from(rating).where(eq(rating.userId, "g1"))).toEqual([]);
  });

  it("davet ettiği kişiler kalır, yalnızca 'davet eden' boşalır; kullanılmamış kodları silinir", async () => {
    const codes = (await myInvites(db, "g1")).codes;
    await claimInvite(db, { userId: "g2", code: codes[0]!.code, nickname: "kalacak", now: NOW });

    expect((await deleteAccount(db, { userId: "g1", confirmNickname: "silinecek" })).ok).toBe(true);

    const [kalan] = await db.select().from(profile).where(eq(profile.id, "g2"));
    expect(kalan).toMatchObject({ nickname: "kalacak", invitedBy: null });
    const left = await db.select().from(inviteCode).where(eq(inviteCode.createdBy, "g1"));
    expect(left).toEqual([]);
    // Kendi kullandığı kod: kayıt kalır, kullanan boşalır (kimin kullandığı bilgisi silinir).
    const used = await db.select().from(inviteCode).where(eq(inviteCode.usedBy, "g1"));
    expect(used).toEqual([]);
    // Boşalan kod yeniden kullanılamaz (kullanım tarihi kalır).
    const [spent] = await db.select().from(inviteCode).where(eq(inviteCode.code, rootCode));
    expect(spent?.usedAt).not.toBeNull();
    expect(await claimInvite(db, { userId: "g3", code: rootCode, nickname: "kacak", now: NOW })).toEqual({ ok: false, error: "used_code" });
  });

  it("takma ad onayı tutmazsa silmez", async () => {
    expect(await deleteAccount(db, { userId: "g1", confirmNickname: "başkası" })).toEqual({ ok: false, error: "confirm_mismatch" });
    expect(await db.select().from(profile).where(eq(profile.id, "g1"))).toHaveLength(1);
  });

  it("yönetici hesabı silinemez", async () => {
    await db.update(profile).set({ role: "admin" }).where(eq(profile.id, "g1"));
    expect(await deleteAccount(db, { userId: "g1", confirmNickname: "silinecek" })).toEqual({ ok: false, error: "admin_cannot_delete" });
    expect(await db.select().from(user).where(eq(user.id, "g1"))).toHaveLength(1);
  });

  it("profili olmayan (davet beklerken vazgeçen) kullanıcı da Google bilgisini silebilir", async () => {
    await db.insert(user).values({ id: "g9", name: "Vazgeçen", email: "g9@example.com" });
    expect(await deleteAccount(db, { userId: "g9", confirmNickname: "" })).toEqual({ ok: true });
    expect(await db.select().from(user).where(eq(user.id, "g9"))).toEqual([]);
  });
});
