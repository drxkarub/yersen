import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono, type MiddlewareHandler } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { sql } from "drizzle-orm";
import type { HealthResponse } from "@yersen/shared";
import type { Db } from "./db/client.ts";

export type AppDeps = {
  db: Db;
  /** Derlenmiş ön yüz klasörü (web/dist). Verilirse API onu da servis eder; üretimde tek imaj. */
  staticDir?: string;
};

export function createApp({ db, staticDir }: AppDeps) {
  const api = new Hono();

  api.get("/health", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json<HealthResponse>({ ok: true, db: true });
    } catch {
      return c.json<HealthResponse>({ ok: false, db: false }, 503);
    }
  });

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
