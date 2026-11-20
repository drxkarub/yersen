import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { HealthResponse } from "@yersen/shared";
import type { Db } from "./db/client.ts";
import { profile } from "./db/schema.ts";
import {
  listDishes,
  listUsers,
  recentScrapeRuns,
  removeDishImage,
  setDishImage,
  setModerator,
} from "./domain/admin.ts";
import { deleteAccount } from "./domain/account.ts";
import { claimInvite, grantMoreInvites, myInvites } from "./domain/invites.ts";
import { getDayMenu, getDayNav, getUpcoming } from "./domain/menuQueries.ts";
import { addTrayPhoto, removeTrayPhoto } from "./domain/trayPhotos.ts";
import { istanbulDate } from "./domain/time.ts";
import { rateDish } from "./domain/rating.ts";
import { setSwipe } from "./domain/swipe.ts";

/** Giriş katmanı. Üretimde Better Auth; testlerde sahte. */
export type AuthPort = {
  handler: (req: Request) => Promise<Response>;
  session: (headers: Headers) => Promise<{ userId: string; name: string; email: string; image: string | null } | null>;
};

export type AppDeps = {
  db: Db;
  auth?: AuthPort;
  /** Derlenmiş ön yüz klasörü (web/dist). Verilirse API onu da servis eder; üretimde tek imaj. */
  staticDir?: string;
  /** İndirilen yemek görselleri; /img/<id>.jpg olarak servis edilir. */
  imageDir?: string;
  /** https://yersen.aegis.net.tr — yönetim isteklerinde Origin bununla eşleşmeli. */
  publicOrigin?: string;
  now?: () => Date;
};

type Env = { Variables: { userId: string } };

// Servis hata kodlarının HTTP karşılıkları.
const STATUS: Record<string, ContentfulStatusCode> = {
  not_found: 404,
  banned: 403,
  forbidden: 403,
  cannot_change_admin: 409,
  bad_count: 400,
  invalid_image: 400,
  future_day: 400,
  too_many_photos: 409,
  confirm_mismatch: 400,
  admin_cannot_delete: 409,
  invalid_score: 400,
  invalid_code: 400,
  used_code: 400,
  nickname_invalid: 400,
  nickname_taken: 409,
  already_onboarded: 409,
  window_closed: 409,
  said_no: 409,
  past_day: 409,
  rate_limited: 429,
};
const fail = (c: Context, error: string) => c.json({ error }, STATUS[error] ?? 400);

const onboardingBody = z.object({ code: z.string().min(1).max(32), nickname: z.string().min(1).max(64) });
const swipeBody = z.object({ menuItemId: z.number().int().positive(), choice: z.enum(["yes", "no", "maybe"]) });
const ratingBody = z.object({ menuItemId: z.number().int().positive(), score: z.number() });

export function createApp({ db, auth, staticDir, imageDir, publicOrigin, now = () => new Date() }: AppDeps) {
  const api = new Hono<Env>();

  api.get("/health", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json<HealthResponse>({ ok: true, db: true });
    } catch {
      return c.json<HealthResponse>({ ok: false, db: false }, 503);
    }
  });

  if (auth) {
    api.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

    const requireUser: MiddlewareHandler<Env> = async (c, next) => {
      const s = await auth.session(c.req.raw.headers);
      if (!s) return c.json({ error: "unauthorized" }, 401);
      c.set("userId", s.userId);
      await next();
    };
    // CSRF: yazma istekleri yalnızca JSON (başka sitedeki bir form JSON gönderemez, ön kontrol ister).
    const requireJson: MiddlewareHandler<Env> = async (c, next) => {
      if (c.req.method !== "GET" && !c.req.header("content-type")?.startsWith("application/json")) {
        return c.json({ error: "unsupported_media_type" }, 415);
      }
      await next();
    };
    const body = async <T>(c: Context, schema: z.ZodType<T>): Promise<T | null> => {
      const parsed = schema.safeParse(await c.req.json().catch(() => null));
      return parsed.success ? parsed.data : null;
    };

    api.get("/me", async (c) => {
      const s = await auth.session(c.req.raw.headers);
      if (!s) return c.json({ error: "unauthorized" }, 401);
      const [p] = await db
        .select({ nickname: profile.nickname, role: profile.role })
        .from(profile)
        .where(eq(profile.id, s.userId));
      return c.json({ user: { name: s.name, image: s.image }, profile: p ?? null });
    });

    // KVKK: hesabı ve verileri sil. Yönetici hesabı silinemez.
    api.delete("/me", requireJson, requireUser, async (c) => {
      const b = await body(c, z.object({ confirmNickname: z.string().max(64) }));
      if (!b) return c.json({ error: "bad_request" }, 400);
      const r = await deleteAccount(db, { userId: c.get("userId"), confirmNickname: b.confirmNickname });
      return r.ok ? c.body(null, 204) : fail(c, r.error);
    });

    api.post("/onboarding", requireJson, requireUser, async (c) => {
      const b = await body(c, onboardingBody);
      if (!b) return c.json({ error: "bad_request" }, 400);
      const r = await claimInvite(db, { userId: c.get("userId"), code: b.code, nickname: b.nickname, now: now() });
      return r.ok ? c.body(null, 201) : fail(c, r.error);
    });

    const requireProfile: MiddlewareHandler<Env> = async (c, next) => {
      const [p] = await db.select({ bannedAt: profile.bannedAt }).from(profile).where(eq(profile.id, c.get("userId")));
      if (!p) return c.json({ error: "no_profile" }, 403);
      if (p.bannedAt) return c.json({ error: "banned" }, 403);
      await next();
    };

    api.get("/invites", requireUser, requireProfile, async (c) => c.json(await myInvites(db, c.get("userId"))));

    // Yönetici kodları bitince kendine 5 yeni kod alır (Ben sayfası).
    api.post("/invites/more", requireJson, requireUser, requireProfile, async (c) => {
      const r = await grantMoreInvites(db, { actorId: c.get("userId") });
      return r.ok ? c.json({ codes: r.codes }) : fail(c, r.error);
    });

    api.get("/menu/today", requireUser, requireProfile, async (c) => {
      const t = now();
      const today = await getDayMenu(db, { date: istanbulDate(t), userId: c.get("userId"), now: t });
      // Bugün menü yoksa (hafta sonu, tatil, yayınlanmamış): sıradaki menülü gün.
      const next = today ? null : ((await getUpcoming(db, { userId: c.get("userId"), now: t }))[0] ?? null);
      return c.json({ today, next });
    });

    api.get("/menu/day", requireUser, requireProfile, async (c) => {
      const t = now();
      const date = c.req.query("date") ?? istanbulDate(t);
      if (!isCalendarDate(date)) return c.json({ error: "bad_request" }, 400);
      return c.json(await getDayNav(db, { date, userId: c.get("userId"), now: t }));
    });

    api.get("/menu/upcoming", requireUser, requireProfile, async (c) => {
      const t = now();
      return c.json({ days: await getUpcoming(db, { userId: c.get("userId"), now: t }) });
    });

    api.post("/swipes", requireJson, requireUser, async (c) => {
      const b = await body(c, swipeBody);
      if (!b) return c.json({ error: "bad_request" }, 400);
      const r = await setSwipe(db, { userId: c.get("userId"), ...b, now: now() });
      return r.ok ? c.body(null, 204) : fail(c, r.error);
    });

    api.post("/ratings", requireJson, requireUser, async (c) => {
      const b = await body(c, ratingBody);
      if (!b) return c.json({ error: "bad_request" }, 400);
      const r = await rateDish(db, { userId: c.get("userId"), ...b, now: now() });
      return r.ok ? c.json({ ratingId: r.ratingId }, 201) : fail(c, r.error);
    });

    // --- Yönetim: moderatör ve admin. İnce yetki (yalnızca admin) domain fonksiyonlarında. ---
    const admin = new Hono<Env & { Variables: { role: "moderator" | "admin" } }>();
    admin.use(requireUser);
    admin.use(async (c, next) => {
      // Başka siteden gelen istekler (CSRF) reddedilir; SameSite=Lax çereze ek kat.
      const origin = c.req.header("origin");
      if (origin && publicOrigin && origin !== publicOrigin) return c.json({ error: "forbidden" }, 403);
      const [p] = await db.select({ role: profile.role, bannedAt: profile.bannedAt }).from(profile).where(eq(profile.id, c.get("userId")));
      if (p?.bannedAt || (p?.role !== "admin" && p?.role !== "moderator")) return c.json({ error: "forbidden" }, 403);
      c.set("role", p.role);
      await next();
    });

    admin.get("/overview", async (c) => c.json({ role: c.get("role"), scrapeRuns: await recentScrapeRuns(db, 5) }));

    admin.get("/users", async (c) => {
      if (c.get("role") !== "admin") return fail(c, "forbidden");
      return c.json({ users: await listUsers(db) });
    });

    admin.post("/users/:id/moderator", requireJson, async (c) => {
      const b = await body(c, z.object({ moderator: z.boolean() }));
      if (!b) return c.json({ error: "bad_request" }, 400);
      const r = await setModerator(db, { actorId: c.get("userId"), targetId: c.req.param("id"), moderator: b.moderator });
      return r.ok ? c.body(null, 204) : fail(c, r.error);
    });

    admin.get("/dishes", async (c) => c.json({ dishes: await listDishes(db, { q: c.req.query("q") }) }));

    admin.post("/dishes/:id/image", async (c) => {
      if (!imageDir) return c.json({ error: "images_disabled" }, 503);
      const form = await c.req.parseBody().catch(() => null);
      const file = form?.["file"];
      if (!(file instanceof File)) return c.json({ error: "bad_request" }, 400);
      if (file.size > 10 * 1024 * 1024) return c.json({ error: "too_large" }, 413);
      const r = await setDishImage(db, {
        actorId: c.get("userId"),
        dishId: Number(c.req.param("id")),
        bytes: new Uint8Array(await file.arrayBuffer()),
        dir: imageDir,
        now: now(),
      });
      return r.ok ? c.json({ imageUrl: r.imageUrl }, 201) : fail(c, r.error);
    });

    admin.delete("/dishes/:id/image", async (c) => {
      const r = await removeDishImage(db, { actorId: c.get("userId"), dishId: Number(c.req.param("id")) });
      return r.ok ? c.body(null, 204) : fail(c, r.error);
    });

    admin.post("/days/:date/tray", async (c) => {
      if (!imageDir) return c.json({ error: "images_disabled" }, 503);
      const date = c.req.param("date");
      if (!isCalendarDate(date)) return c.json({ error: "bad_request" }, 400);
      const form = await c.req.parseBody().catch(() => null);
      const file = form?.["file"];
      if (!(file instanceof File)) return c.json({ error: "bad_request" }, 400);
      if (file.size > 10 * 1024 * 1024) return c.json({ error: "too_large" }, 413);
      const r = await addTrayPhoto(db, {
        actorId: c.get("userId"),
        date,
        bytes: new Uint8Array(await file.arrayBuffer()),
        dir: imageDir,
        now: now(),
      });
      return r.ok ? c.json({ id: r.id, url: r.url }, 201) : fail(c, r.error);
    });

    admin.delete("/tray/:id", async (c) => {
      if (!imageDir) return c.json({ error: "images_disabled" }, 503);
      const r = await removeTrayPhoto(db, { actorId: c.get("userId"), photoId: Number(c.req.param("id")), dir: imageDir });
      return r.ok ? c.body(null, 204) : fail(c, r.error);
    });

    api.route("/admin", admin);
  }

  api.all("*", (c) => c.json({ error: "Böyle bir API yolu yok" }, 404));

  const app = new Hono();
  app.route("/api", api);

  if (imageDir) {
    app.use(
      "/img/*",
      cacheControl("public, max-age=604800"),
      serveStatic({ root: imageDir, rewriteRequestPath: (p) => p.replace(/^\/img/, "") }),
    );
    app.get("/img/*", (c) => c.notFound());
  }

  if (staticDir) {
    // Dosya adları içerik özetli (index-abc123.js): sonsuza kadar önbelleğe alınabilir.
    app.use("/assets/*", cacheControl("public, max-age=31536000, immutable"), serveStatic({ root: staticDir }));
    app.get("/assets/*", (c) => c.notFound());

    // Diğer statik dosyalar (favicon, manifest) ve tarayıcı içi rotalar için index.html.
    app.use("*", cacheControl("no-cache"), serveStatic({ root: staticDir }));
    const indexHtml = readFileSync(join(staticDir, "index.html"), "utf8");
    app.get("*", (c) => {
      c.header("Cache-Control", "no-cache");
      return c.html(indexHtml);
    });
  }

  return app;
}

/** Başarılı statik cevaba Cache-Control ekler (serveStatic'in onFound başlıkları cevaba taşınmıyor). */
function cacheControl(value: string): MiddlewareHandler {
  return async (c, next) => {
    await next();
    if (c.res.status === 200) c.res.headers.set("Cache-Control", value);
  };
}

/** YYYY-MM-DD ve gerçekten var olan bir gün mü (2026-13-45 değil). */
function isCalendarDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
