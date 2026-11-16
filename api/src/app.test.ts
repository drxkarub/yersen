import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createTestDb } from "./db/client.ts";

describe("GET /api/health", () => {
  it("veritabanı erişilebilirken 200 ve db:true döner", async () => {
    const app = createApp({ db: await createTestDb() });

    const res = await app.request("/api/health");

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

    const res = await app.request("/api/health");

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: false });
  });

  it("bilinmeyen API yolu SPA'ya düşmez, 404 döner", async () => {
    const app = createApp({ db: await createTestDb(), staticDir: makeDist() });
    const res = await app.request("/api/yok-boyle-bir-sey");
    expect(res.status).toBe(404);
  });
});

describe("ön yüz dosyaları (staticDir verildiğinde)", () => {
  it("varlık dosyalarını uzun süreli önbellekle servis eder", async () => {
    const app = createApp({ db: await createTestDb(), staticDir: makeDist() });
    const res = await app.request("/assets/index-abc123.js");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("console.log(1)");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("tarayıcı içi rotalarda index.html'i önbelleksiz döner", async () => {
    const app = createApp({ db: await createTestDb(), staticDir: makeDist() });
    for (const path of ["/", "/kaydir", "/ben/ayarlar"]) {
      const res = await app.request(path);
      expect(res.status, path).toBe(200);
      expect(await res.text()).toContain("<div id=\"root\">");
      expect(res.headers.get("cache-control")).toBe("no-cache");
    }
  });

  it("olmayan varlık dosyası için index.html değil 404 döner", async () => {
    const app = createApp({ db: await createTestDb(), staticDir: makeDist() });
    const res = await app.request("/assets/eski-surum.js");
    expect(res.status).toBe(404);
  });
});

function makeDist(): string {
  const dir = mkdtempSync(join(tmpdir(), "yersen-dist-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), '<!doctype html><div id="root"></div>');
  writeFileSync(join(dir, "assets", "index-abc123.js"), "console.log(1)");
  return dir;
}
