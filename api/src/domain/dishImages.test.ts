import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type Db } from "../db/client.ts";
import { dish } from "../db/schema.ts";
import { fillDishImages, searchQueries, type CommonsHit, type ImageDeps } from "./dishImages.ts";

const NOW = new Date("2026-11-17T04:00:00Z");
let db: Db;
let dir: string;
beforeEach(async () => {
  db = await createTestDb();
  dir = mkdtempSync(join(tmpdir(), "yersen-img-"));
});

const hit = (title: string, license = "CC BY-SA 4.0"): CommonsHit => ({
  title,
  thumbUrl: `https://upload.wikimedia.org/thumb/${encodeURIComponent(title)}.jpg`,
  pageUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title)}`,
  artist: "E4024",
  license,
});

function deps(results: Record<string, CommonsHit[]>, searched: string[] = []): ImageDeps {
  return {
    search: async (q) => {
      searched.push(q);
      return results[q] ?? [];
    },
    download: async (url) => new TextEncoder().encode(`resim:${url}`),
  };
}

describe("searchQueries", () => {
  it("her terim önce 'food' ile (yemek bağlamı), sonra yalın; tam ad, çorba eki, son kelime sırasıyla", () => {
    expect(searchQueries("DÜĞÜN ÇORBA")).toEqual([
      "düğün çorba food", "düğün çorba", "düğün çorbası food", "düğün çorbası", "çorba food", "çorba",
    ]);
    expect(searchQueries("ERİŞTE")).toEqual(["erişte food", "erişte"]);
  });
});

describe("fillDishImages", () => {
  it("bulunan görseli indirir, yolunu ve atfını yazar", async () => {
    const [d] = await db.insert(dish).values({ key: "etli nohut", displayName: "ETLİ NOHUT" }).returning();
    const r = await fillDishImages(db, { dir, now: NOW, ...deps({ "etli nohut food": [hit("Nohut yahni.jpg")] }) });
    expect(r).toEqual({ checked: 1, found: 1 });
    const [row] = await db.select().from(dish).where(eq(dish.id, d!.id));
    expect(row).toMatchObject({
      imageUrl: `/img/${d!.id}.jpg`,
      imageCredit: "E4024, CC BY-SA 4.0",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Nohut%20yahni.jpg",
    });
    expect(row!.imageCheckedAt).toEqual(NOW);
    expect(readFileSync(join(dir, `${d!.id}.jpg`), "utf8")).toContain("upload.wikimedia.org");
  });

  it("tam ad yoksa genel terime düşer (benzer yemek yeter)", async () => {
    await db.insert(dish).values({ key: "hamburger köfte", displayName: "HAMBURGER KÖFTE" });
    const searched: string[] = [];
    const r = await fillDishImages(db, { dir, now: NOW, ...deps({ köfte: [hit("Köfte.jpg")] }, searched) });
    expect(searched).toEqual(["hamburger köfte food", "hamburger köfte", "köfte food", "köfte"]);
    expect(r.found).toBe(1);
  });

  it("serbest olmayan lisansları (NC, ND) atlar", async () => {
    await db.insert(dish).values({ key: "ayran", displayName: "AYRAN" });
    const r = await fillDishImages(db, {
      dir,
      now: NOW,
      ...deps({ "ayran food": [hit("a.jpg", "CC BY-NC 2.0"), hit("b.jpg", "CC BY-ND 4.0"), hit("c.jpg", "CC0")] }),
    });
    expect(r.found).toBe(1);
    const [row] = await db.select().from(dish);
    expect(row?.imageCredit).toBe("E4024, CC0");
  });

  it("bulunamayan yemeği işaretler ve bir hafta yeniden aramaz", async () => {
    await db.insert(dish).values({ key: "xyz", displayName: "XYZ" });
    const searched: string[] = [];
    await fillDishImages(db, { dir, now: NOW, ...deps({}, searched) });
    await fillDishImages(db, { dir, now: new Date(NOW.getTime() + 6 * 86400_000), ...deps({}, searched) });
    expect(searched).toEqual(["xyz food", "xyz"]);
    await fillDishImages(db, { dir, now: new Date(NOW.getTime() + 8 * 86400_000), ...deps({}, searched) });
    expect(searched).toEqual(["xyz food", "xyz", "xyz food", "xyz"]);
  });

  it("görseli olan yemeğe dokunmaz (yönetici seçimi korunur)", async () => {
    await db.insert(dish).values({ key: "ayran", displayName: "AYRAN", imageUrl: "/img/elle.jpg" });
    const searched: string[] = [];
    expect(await fillDishImages(db, { dir, now: NOW, ...deps({}, searched) })).toEqual({ checked: 0, found: 0 });
    expect(searched).toEqual([]);
  });

  it("bir yemekte hata olsa da diğerlerine devam eder", async () => {
    await db.insert(dish).values([
      { key: "a", displayName: "A" },
      { key: "b", displayName: "B" },
    ]);
    const r = await fillDishImages(db, {
      dir,
      now: NOW,
      search: async (q) => {
        if (q.startsWith("a")) throw new Error("commons zaman aşımı");
        return [hit("b.jpg")];
      },
      download: async () => new Uint8Array([1]),
    });
    expect(r).toEqual({ checked: 2, found: 1 });
  });

  it("ağ hatası alan yemek 'bulunamadı' sayılmaz; bir sonraki çalışmada yeniden denenir", async () => {
    await db.insert(dish).values({ key: "tulumba tatlısı", displayName: "TULUMBA TATLISI" });
    const failing: ImageDeps = { search: async () => { throw new Error("fetch failed"); }, download: async () => new Uint8Array() };
    await fillDishImages(db, { dir, now: NOW, ...failing });
    const searched: string[] = [];
    const r = await fillDishImages(db, { dir, now: new Date(NOW.getTime() + 3600_000), ...deps({ "tulumba tatlısı food": [hit("Tulumba.jpg")] }, searched) });
    expect(searched).toEqual(["tulumba tatlısı food"]);
    expect(r.found).toBe(1);
  });
});
