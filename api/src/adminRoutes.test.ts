import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp, type AuthPort } from "./app.ts";
import { createTestDb, type Db } from "./db/client.ts";
import { dish, profile } from "./db/schema.ts";

const fakeAuth: AuthPort = {
  handler: async () => new Response("auth"),
  session: async (h) => {
    const id = h.get("x-test-user");
    return id ? { userId: id, name: id, email: `${id}@x`, image: null } : null;
  },
};

let db: Db;
let app: ReturnType<typeof createApp>;
let dishId: number;
beforeEach(async () => {
  db = await createTestDb();
  await db.insert(profile).values([
    { id: "adm", nickname: "big_brother", role: "admin" },
    { id: "mod", nickname: "moddy", role: "moderator" },
    { id: "u1", nickname: "ali" },
  ]);
  dishId = (await db.insert(dish).values({ key: "erişte", displayName: "ERİŞTE" }).returning({ id: dish.id }))[0]!.id;
  app = createApp({ db, auth: fakeAuth, imageDir: mkdtempSync(join(tmpdir(), "yersen-ar-")), publicOrigin: "https://yersen.aegis.net.tr" });
});

const call = (path: string, user: string | null, init: { method?: string; json?: unknown; body?: BodyInit; origin?: string } = {}) =>
  app.request(path, {
    method: init.method ?? (init.json !== undefined || init.body ? "POST" : "GET"),
    headers: {
      ...(user ? { "x-test-user": user } : {}),
      ...(init.json !== undefined ? { "content-type": "application/json" } : {}),
      ...(init.origin ? { origin: init.origin } : {}),
    },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

describe("/api/admin yetkileri", () => {
  it("oturumsuz 401, normal kullanıcı 403", async () => {
    expect((await call("/api/admin/overview", null)).status).toBe(401);
    expect((await call("/api/admin/overview", "u1")).status).toBe(403);
  });

  it("moderatör özeti ve yemekleri görür, kullanıcıları göremez", async () => {
    const o = await (await call("/api/admin/overview", "mod")).json();
    expect(o.role).toBe("moderator");
    expect((await call("/api/admin/dishes?q=erişte", "mod")).status).toBe(200);
    expect((await call("/api/admin/users", "mod")).status).toBe(403);
    expect((await call("/api/admin/invites", "mod", { json: { count: 1 } })).status).toBe(403);
  });

  it("yönetici kullanıcıları görür, moderatör atar, kod üretir", async () => {
    const users = await (await call("/api/admin/users", "adm")).json();
    expect(users.users).toHaveLength(3);
    expect((await call("/api/admin/users/u1/moderator", "adm", { json: { moderator: true } })).status).toBe(204);
    const r = await call("/api/admin/invites", "adm", { json: { count: 2 } });
    expect(r.status).toBe(201);
    expect((await r.json()).codes).toHaveLength(2);
  });

  it("başka siteden gelen istek (Origin uyuşmaz) 403", async () => {
    const r = await call("/api/admin/invites", "adm", { json: { count: 1 }, origin: "https://kotu.example" });
    expect(r.status).toBe(403);
  });
});

describe("/api/admin/dishes/:id/image", () => {
  const upload = async (user: string, bytes: Uint8Array) => {
    const form = new FormData();
    form.set("file", new Blob([Buffer.from(bytes)], { type: "image/jpeg" }), "foto.jpg");
    return call(`/api/admin/dishes/${dishId}/image`, user, { body: form, origin: "https://yersen.aegis.net.tr" });
  };
  const jpeg = async () => new Uint8Array(await sharp({ create: { width: 900, height: 600, channels: 3, background: "#aa8844" } }).jpeg().toBuffer());

  it("moderatör yükler (201), normal kullanıcı yükleyemez (403)", async () => {
    expect((await upload("u1", await jpeg())).status).toBe(403);
    const r = await upload("mod", await jpeg());
    expect(r.status).toBe(201);
    expect((await r.json()).imageUrl).toMatch(/^\/img\/\d+-\d+\.jpg$/);
  });

  it("resim olmayan dosya 400", async () => {
    expect((await upload("adm", new TextEncoder().encode("değil"))).status).toBe(400);
  });

  it("görseli kaldırır (204)", async () => {
    expect((await call(`/api/admin/dishes/${dishId}/image`, "mod", { method: "DELETE" })).status).toBe(204);
  });
});
