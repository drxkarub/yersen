import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createTestDb } from "./db/client.ts";

describe("GET /health", () => {
  it("veritabanı erişilebilirken 200 ve db:true döner", async () => {
    const db = await createTestDb();
    const app = createApp({ db });

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true });
  });

  it("veritabanı hata verirse 503 ve db:false döner", async () => {
    const brokenDb = {
      execute: async () => {
        throw new Error("bağlantı yok");
      },
    };
    const app = createApp({ db: brokenDb as never });

    const res = await app.request("/health");

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: false });
  });
});
