import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@yersen/api/db";
import { runScrape, type Ping } from "./run.ts";

const fixture = (name: string) => readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), "utf8");
const NOW = new Date("2026-11-16T07:00:00Z"); // 16 Kasım 10:00 İstanbul

let db: Db;
let pings: { kind: "success" | "fail"; message: string }[];
const ping: Ping = async (kind, message) => {
  pings.push({ kind, message });
};
beforeEach(async () => {
  db = await createTestDb();
  pings = [];
});

const menuCount = async () =>
  ((await db.execute("select count(*)::int as n from menu")) as unknown as { rows: { n: number }[] }).rows[0]!;

describe("runScrape", () => {
  it("menü varsa kaydeder ve başarı bildirir", async () => {
    const r = await runScrape({ db, now: NOW, fetchHtml: async () => fixture("yemeklistesi-2026-11-16.html"), ping });
    expect(r.exitCode).toBe(0);
    expect((await menuCount()).n).toBe(21);
    expect(pings).toEqual([{ kind: "success", message: expect.stringContaining("21 gün") }]);
  });

  it("menü yayınlanmamışsa hiçbir şey yazmaz ama başarı bildirir (alarm değil)", async () => {
    const r = await runScrape({ db, now: NOW, fetchHtml: async () => fixture("unpublished.html"), ping });
    expect(r.exitCode).toBe(0);
    expect((await menuCount()).n).toBe(0);
    expect(pings[0]).toMatchObject({ kind: "success", message: expect.stringContaining("yayınlanmadı") });
  });

  it("sayfa yapısı bozulduysa hata bildirir ve 1 ile çıkar", async () => {
    const r = await runScrape({ db, now: NOW, fetchHtml: async () => fixture("broken-no-table.html"), ping });
    expect(r.exitCode).toBe(1);
    expect(pings[0]).toMatchObject({ kind: "fail", message: expect.stringContaining("#ylistTable") });
  });

  it("siteye ulaşılamazsa hata bildirir ve 1 ile çıkar", async () => {
    const r = await runScrape({
      db,
      now: NOW,
      fetchHtml: async () => {
        throw new Error("ECONNRESET");
      },
      ping,
    });
    expect(r.exitCode).toBe(1);
    expect(pings[0]).toMatchObject({ kind: "fail", message: expect.stringContaining("ECONNRESET") });
  });

  it("healthchecks'e ulaşılamasa da menüyü kaydeder", async () => {
    const r = await runScrape({
      db,
      now: NOW,
      fetchHtml: async () => fixture("yemeklistesi-2026-11-16.html"),
      ping: async () => {
        throw new Error("hc-ping erişilemez");
      },
    });
    expect(r.exitCode).toBe(0);
    expect((await menuCount()).n).toBe(21);
  });
});
