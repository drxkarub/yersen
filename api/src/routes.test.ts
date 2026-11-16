import { beforeEach, describe, expect, it } from "vitest";
import { createApp, type AuthPort } from "./app.ts";
import { createTestDb, type Db } from "./db/client.ts";
import { adminCreateCodes, claimInvite } from "./domain/invites.ts";
import { NOW, setupWorld } from "./test/fixtures.ts";

// Testte Google yok: "x-test-user" başlığı oturum yerine geçer.
const fakeAuth: AuthPort = {
  handler: async () => new Response("auth", { status: 200 }),
  session: async (headers) => {
    const id = headers.get("x-test-user");
    return id ? { userId: id, name: `Ad ${id}`, email: `${id}@example.com`, image: null } : null;
  },
};

let db: Db;
let world: Awaited<ReturnType<typeof setupWorld>>;
let app: ReturnType<typeof createApp>;
beforeEach(async () => {
  db = await createTestDb();
  world = await setupWorld(db); // profiller: u1 (normal), u2 (banlı)
  app = createApp({ db, auth: fakeAuth, now: () => NOW });
});

const req = (path: string, init: { user?: string; method?: string; body?: unknown } = {}) =>
  app.request(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { ...(init.user ? { "x-test-user": init.user } : {}), "content-type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

describe("GET /api/me", () => {
  it("oturum yoksa 401", async () => {
    expect((await req("/api/me")).status).toBe(401);
  });

  it("oturum var, profil yok: profile null (davet ekranına yönlendirilecek)", async () => {
    const res = await req("/api/me", { user: "yeni" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { name: "Ad yeni", image: null }, profile: null });
  });

  it("profil varsa takma ad ve rolü döner; e-posta dönmez", async () => {
    const body = await (await req("/api/me", { user: "u1" })).json();
    expect(body.profile).toMatchObject({ nickname: "u1", role: "user" });
    expect(JSON.stringify(body)).not.toContain("@example.com");
  });
});

describe("POST /api/onboarding", () => {
  it("geçerli kod ve takma adla 201", async () => {
    const [code] = await adminCreateCodes(db, 1);
    const res = await req("/api/onboarding", { user: "yeni", body: { code, nickname: "Yeni_1" } });
    expect(res.status).toBe(201);
  });

  it("hatalı kodda 400 ve hata kodu", async () => {
    const res = await req("/api/onboarding", { user: "yeni", body: { code: "ZZZZZZZZ", nickname: "Yeni_1" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_code" });
  });

  it("alınmış takma adda 409 (büyük/küçük harf duyarsız)", async () => {
    const [a, code] = await adminCreateCodes(db, 2);
    await claimInvite(db, { userId: "ilk", code: a!, nickname: "Burak", now: NOW });
    const res = await req("/api/onboarding", { user: "yeni", body: { code, nickname: "burak" } });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "nickname_taken" });
  });

  it("eksik alanlarda 400", async () => {
    expect((await req("/api/onboarding", { user: "yeni", body: { code: 5 } })).status).toBe(400);
  });

  it("oturum yoksa 401", async () => {
    expect((await req("/api/onboarding", { body: { code: "X", nickname: "abc" } })).status).toBe(401);
  });
});

describe("GET /api/invites", () => {
  it("profili olan kullanıcının 5 kodu", async () => {
    const [code] = await adminCreateCodes(db, 1);
    await claimInvite(db, { userId: "yeni", code: code!, nickname: "yeni", now: NOW });
    const body = await (await req("/api/invites", { user: "yeni" })).json();
    expect(body.codes).toHaveLength(5);
  });

  it("profili yoksa 403", async () => {
    expect((await req("/api/invites", { user: "profilsiz" })).status).toBe(403);
  });
});

describe("POST /api/swipes ve /api/ratings", () => {
  it("kaydırma 204", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    expect((await req("/api/swipes", { user: "u1", body: { menuItemId: it.id, choice: "yes" } })).status).toBe(204);
  });

  it("puan 201 ve ratingId", async () => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    const res = await req("/api/ratings", { user: "u1", body: { menuItemId: it.id, score: 9 } });
    expect(res.status).toBe(201);
    expect(await res.json()).toHaveProperty("ratingId");
  });

  it.each([
    [{ score: 7.5 }, 400, "invalid_score"],
    [{ score: 8, menuItemId: 999_999 }, 404, "not_found"],
  ])("puan hatası %j → %i", async (patch, status, error) => {
    const it = await world.item("2026-11-16", "ETLİ NOHUT");
    const res = await req("/api/ratings", { user: "u1", body: { menuItemId: it.id, ...patch } });
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });

  it("pencere kapalıysa 409", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    const res = await req("/api/ratings", { user: "u1", body: { menuItemId: it.id, score: 8 } });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "window_closed" });
  });

  it("banlı kullanıcı 403", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    expect((await req("/api/swipes", { user: "u2", body: { menuItemId: it.id, choice: "yes" } })).status).toBe(403);
  });

  it("geçersiz seçim 400", async () => {
    const it = await world.item("2026-11-17", "TAVUK SOTE");
    expect((await req("/api/swipes", { user: "u1", body: { menuItemId: it.id, choice: "belki" } })).status).toBe(400);
  });

  it("oturum yoksa 401", async () => {
    expect((await req("/api/swipes", { body: { menuItemId: 1, choice: "yes" } })).status).toBe(401);
  });
});

describe("/api/auth/*", () => {
  it("giriş isteklerini auth katmanına iletir", async () => {
    const res = await req("/api/auth/sign-in/social", { body: { provider: "google" } });
    expect(await res.text()).toBe("auth");
  });
});
