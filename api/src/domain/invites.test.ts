import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { inviteCode, profile } from "../db/schema.ts";
import { adminCreateCodes, claimInvite, myInvites, normalizeCode, validateNickname } from "./invites.ts";

let db: Db;
const NOW = new Date("2026-11-16T10:00:00Z");
beforeEach(async () => {
  db = await createTestDb();
});

describe("validateNickname", () => {
  it.each(["ali", "Şükrü_42", "yemekçi.burak", "ÇİĞDEM"])("'%s' geçerli", (n) => {
    expect(validateNickname(n)).toEqual({ ok: true, nickname: n });
  });

  it("baştaki/sondaki boşluğu siler", () => {
    expect(validateNickname("  ali  ")).toEqual({ ok: true, nickname: "ali" });
  });

  it.each(["al", "a".repeat(21), "ali veli", "ali@", "admin", "Yersen", "", "__"])("'%s' geçersiz", (n) => {
    expect(validateNickname(n).ok).toBe(false);
  });
});

describe("normalizeCode", () => {
  it("büyük harfe çevirir, tire ve boşlukları yok sayar", () => {
    expect(normalizeCode(" k7mx-q2pa ")).toBe("K7MXQ2PA");
  });
});

describe("adminCreateCodes", () => {
  it("istenen sayıda, karıştırılması zor harflerden 8 haneli, tekil kod üretir", async () => {
    const codes = await adminCreateCodes(db, 20);
    expect(codes).toHaveLength(20);
    expect(new Set(codes).size).toBe(20);
    for (const c of codes) expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });
});

describe("claimInvite", () => {
  it("geçerli kodla profil oluşturur ve kodu kullanılmış işaretler", async () => {
    const [code] = await adminCreateCodes(db, 1);
    const r = await claimInvite(db, { userId: "u1", code: code!.toLowerCase(), nickname: "Burak", now: NOW });
    expect(r).toEqual({ ok: true });
    const [p] = await db.select().from(profile).where(eq(profile.id, "u1"));
    expect(p).toMatchObject({ nickname: "Burak", invitedBy: null, inviteQuota: 5, role: "user" });
    const [c] = await db.select().from(inviteCode).where(eq(inviteCode.code, code!));
    expect(c).toMatchObject({ usedBy: "u1" });
    expect(c?.usedAt).toEqual(NOW);
  });

  it("kullanıcının davet ettiği kişinin invited_by alanı davet edendir", async () => {
    const [root] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "u1", code: root!, nickname: "ali", now: NOW });
    const [mine] = (await myInvites(db, "u1")).codes;
    await claimInvite(db, { userId: "u2", code: mine!.code, nickname: "veli", now: NOW });
    const [p] = await db.select().from(profile).where(eq(profile.id, "u2"));
    expect(p?.invitedBy).toBe("u1");
  });

  it("olmayan kod invalid_code", async () => {
    expect(await claimInvite(db, { userId: "u1", code: "ZZZZZZZZ", nickname: "ali", now: NOW })).toEqual({ ok: false, error: "invalid_code" });
  });

  it("kullanılmış kod used_code; ikinci kişinin profili oluşmaz", async () => {
    const [code] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "u1", code: code!, nickname: "ali", now: NOW });
    expect(await claimInvite(db, { userId: "u2", code: code!, nickname: "veli", now: NOW })).toEqual({ ok: false, error: "used_code" });
    expect(await db.$count(profile)).toBe(1);
  });

  it("alınmış takma ad nickname_taken (büyük/küçük harf duyarsız); kod harcanmaz", async () => {
    const [a, b] = await adminCreateCodes(db, 2);
    await claimInvite(db, { userId: "u1", code: a!, nickname: "Burak", now: NOW });
    expect(await claimInvite(db, { userId: "u2", code: b!, nickname: "burak", now: NOW })).toEqual({ ok: false, error: "nickname_taken" });
    const [c] = await db.select().from(inviteCode).where(eq(inviteCode.code, b!));
    expect(c?.usedBy).toBeNull();
  });

  it("geçersiz takma ad nickname_invalid", async () => {
    const [code] = await adminCreateCodes(db, 1);
    expect(await claimInvite(db, { userId: "u1", code: code!, nickname: "a b", now: NOW })).toEqual({ ok: false, error: "nickname_invalid" });
  });

  it("zaten profili olan already_onboarded; kod harcanmaz", async () => {
    const [a, b] = await adminCreateCodes(db, 2);
    await claimInvite(db, { userId: "u1", code: a!, nickname: "ali", now: NOW });
    expect(await claimInvite(db, { userId: "u1", code: b!, nickname: "ali2", now: NOW })).toEqual({ ok: false, error: "already_onboarded" });
    const [c] = await db.select().from(inviteCode).where(eq(inviteCode.code, b!));
    expect(c?.usedBy).toBeNull();
  });
});

describe("myInvites", () => {
  it("ilk istekte kota kadar (5) kod üretir, sonraki isteklerde aynılarını döner", async () => {
    const [code] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "u1", code: code!, nickname: "ali", now: NOW });
    const first = await myInvites(db, "u1");
    expect(first.codes).toHaveLength(5);
    expect(first.codes.every((c) => c.usedBy === null)).toBe(true);
    const second = await myInvites(db, "u1");
    expect(second.codes.map((c) => c.code)).toEqual(first.codes.map((c) => c.code));
  });

  it("kullanılan kodu kim kullandıysa takma adıyla gösterir; yeni kod üretmez", async () => {
    const [code] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "u1", code: code!, nickname: "ali", now: NOW });
    const [mine] = (await myInvites(db, "u1")).codes;
    await claimInvite(db, { userId: "u2", code: mine!.code, nickname: "veli", now: NOW });
    const after = await myInvites(db, "u1");
    expect(after.codes).toHaveLength(5);
    expect(after.codes.find((c) => c.code === mine!.code)).toMatchObject({ usedBy: "veli" });
  });

  it("kotası düşürülen kullanıcıya fazladan kod üretilmez", async () => {
    const [code] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "u1", code: code!, nickname: "ali", now: NOW });
    await db.update(profile).set({ inviteQuota: 2 }).where(eq(profile.id, "u1"));
    expect((await myInvites(db, "u1")).codes).toHaveLength(2);
  });

  it("banlı kullanıcının ürettiği kodla kayıt olunamaz (bandan kaçış)", async () => {
    const [root] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "u1", code: root!, nickname: "ali", now: NOW });
    const [mine] = (await myInvites(db, "u1")).codes;
    await db.update(profile).set({ bannedAt: NOW }).where(eq(profile.id, "u1"));
    expect(await claimInvite(db, { userId: "kukla", code: mine!.code, nickname: "kukla", now: NOW })).toEqual({ ok: false, error: "invalid_code" });
  });
});
