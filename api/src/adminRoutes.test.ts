import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createApp, type AuthPort } from "./app.ts";
import { createTestDb, type Db } from "./db/client.ts";
import { dish, menu, profile, venue } from "./db/schema.ts";

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
    expect((await call("/api/admin/users/u1/moderator", "mod", { json: { moderator: true } })).status).toBe(403);
  });

  it("yönetici kullanıcıları görür, moderatör atar", async () => {
    const users = await (await call("/api/admin/users", "adm")).json();
    expect(users.users).toHaveLength(3);
    expect((await call("/api/admin/users/u1/moderator", "adm", { json: { moderator: true } })).status).toBe(204);
  });

  it("başka siteden gelen istek (Origin uyuşmaz) 403", async () => {
    const r = await call("/api/admin/users/u1/moderator", "adm", { json: { moderator: true }, origin: "https://kotu.example" });
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

describe("/api/admin/days/:date/tray ve /api/admin/tray/:id", () => {
  const traySetup = async () => {
    const [v] = await db.select({ id: venue.id }).from(venue).where(eq(venue.slug, "trakya-merkez"));
    await db.insert(menu).values({ venueId: v!.id, date: "2026-11-16", source: "scraper" });
  };
  const jpeg = async () => new Uint8Array(await sharp({ create: { width: 900, height: 600, channels: 3, background: "#aa8844" } }).jpeg().toBuffer());
  const upload = async (user: string, date = "2026-11-16") => {
    const form = new FormData();
    form.set("file", new Blob([Buffer.from(await jpeg())], { type: "image/jpeg" }), "tepsi.jpg");
    return call(`/api/admin/days/${date}/tray`, user, { body: form, origin: "https://yersen.aegis.net.tr" });
  };

  it("moderatör yükler (201) ve kaldırır (204); normal kullanıcı 403", async () => {
    await traySetup();
    expect((await upload("u1")).status).toBe(403);
    const r = await upload("mod");
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body.url).toMatch(/^\/img\/tray-/);
    expect((await call(`/api/admin/tray/${body.id}`, "u1", { method: "DELETE", origin: "https://yersen.aegis.net.tr" })).status).toBe(403);
    expect((await call(`/api/admin/tray/${body.id}`, "mod", { method: "DELETE", origin: "https://yersen.aegis.net.tr" })).status).toBe(204);
  });

  it("bozuk tarih 400, menüsüz gün 404", async () => {
    await traySetup();
    expect((await upload("mod", "dun")).status).toBe(400);
    expect((await upload("mod", "2026-11-21")).status).toBe(404);
  });
});
