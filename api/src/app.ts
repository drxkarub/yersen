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
import { claimInvite, myInvites } from "./domain/invites.ts";
import { getDayMenu, getUpcoming } from "./domain/menuQueries.ts";
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
  now?: () => Date;
};

type Env = { Variables: { userId: string } };

// Servis hata kodlarının HTTP karşılıkları.
const STATUS: Record<string, ContentfulStatusCode> = {
  not_found: 404,
  banned: 403,
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

export function createApp({ db, auth, staticDir, now = () => new Date() }: AppDeps) {
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

    api.post("/onboarding", requireJson, requireUser, async (c) => {
      const b = await body(c, onboardingBody);
      if (!b) return c.json({ error: "bad_request" }, 400);
      const r = await claimInvite(db, { userId: c.get("userId"), code: b.code, nickname: b.nickname, now: now() });
      return r.ok ? c.body(null, 201) : fail(c, r.error);
    });

    const requireProfile: MiddlewareHandler<Env> = async (c, next) => {
      const [p] = await db.select({ id: profile.id }).from(profile).where(eq(profile.id, c.get("userId")));
      if (!p) return c.json({ error: "no_profile" }, 403);
      await next();
    };

    api.get("/invites", requireUser, requireProfile, async (c) => c.json(await myInvites(db, c.get("userId"))));

    api.get("/menu/today", requireUser, requireProfile, async (c) => {
      const t = now();
      const today = await getDayMenu(db, { date: istanbulDate(t), userId: c.get("userId"), now: t });
      // Bugün menü yoksa (hafta sonu, tatil, yayınlanmamış): sıradaki menülü gün.
      const next = today ? null : ((await getUpcoming(db, { userId: c.get("userId"), now: t }))[0] ?? null);
      return c.json({ today, next });
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
  }

  api.all("*", (c) => c.json({ error: "Böyle bir API yolu yok" }, 404));

  const app = new Hono();
  app.route("/api", api);

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
