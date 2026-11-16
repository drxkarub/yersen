import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { HealthResponse } from "@yersen/shared";
import type { Db } from "./db/client.ts";

export type AppDeps = {
  db: Db;
};

export function createApp({ db }: AppDeps) {
  const app = new Hono();

  app.get("/health", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json<HealthResponse>({ ok: true, db: true });
    } catch {
      return c.json<HealthResponse>({ ok: false, db: false }, 503);
    }
  });

  return app;
}
