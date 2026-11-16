import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { dish } from "../db/schema.ts";

/** Wikimedia Commons arama sonucu (ilk uygunu kullanılır). */
export type CommonsHit = { title: string; thumbUrl: string; pageUrl: string; artist: string; license: string };

export type ImageDeps = {
  search: (query: string) => Promise<CommonsHit[]>;
  download: (url: string) => Promise<Uint8Array>;
};

const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // bulunamayan yemek haftada bir yeniden aranır
const PER_RUN = 30; // Commons'u yormamak için bir çalışmada en fazla bu kadar yemek

/** Serbest lisanslar: CC0, kamu malı, CC BY, CC BY-SA. NC ve ND elenir. */
export function isFreeLicense(license: string): boolean {
  const l = license.toUpperCase();
  if (/\bNC\b|\bND\b|NONCOMMERCIAL|NODERIV/.test(l)) return false;
  return /^CC0|PUBLIC DOMAIN|^PD\b|^CC BY(-SA)?\b/.test(l);
}

/**
 * Aranacak terimler, özelden genele. Amaç fikir vermek: birebir aynı yemek şart değil
 * ("Beklenen yemek görseli"). Menüdeki "ÇORBA" Commons'ta çoğunlukla "çorbası" diye geçer.
 */
export function searchQueries(displayName: string): string[] {
  const name = displayName.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
  const words = name.split(" ");
  const bases = [name];
  if (words.length > 1 && words.at(-1) === "çorba") bases.push(`${name}sı`);
  if (words.length > 1) bases.push(words.at(-1)!);
  // "food" eki yemek dışı eşleşmeleri (aynı adlı köy, şarkı) eler; sonuç yoksa yalın terim denenir.
  return [...new Set(bases)].flatMap((b) => [`${b} food`, b]);
}

/** Görseli olmayan yemeklere Commons'tan temsili görsel bulur, indirir ve kaydeder. */
export async function fillDishImages(
  db: Db,
  opts: { dir: string; now: Date } & ImageDeps,
): Promise<{ checked: number; found: number }> {
  const retryBefore = new Date(opts.now.getTime() - RETRY_AFTER_MS);
  const todo = await db
    .select({ id: dish.id, displayName: dish.displayName })
    .from(dish)
    .where(and(isNull(dish.imageUrl), eq(dish.imageLocked, false), or(isNull(dish.imageCheckedAt), lt(dish.imageCheckedAt, retryBefore))))
    .limit(PER_RUN);

  let found = 0;
  for (const d of todo) {
    let hit: CommonsHit | undefined;
    try {
      for (const q of searchQueries(d.displayName)) {
        hit = (await opts.search(q)).find((h) => isFreeLicense(h.license));
        if (hit) break;
      }
      if (hit) {
        await writeFile(join(opts.dir, `${d.id}.jpg`), await opts.download(hit.thumbUrl));
        await db
          .update(dish)
          .set({
            imageUrl: `/img/${d.id}.jpg`,
            imageCredit: `${hit.artist}, ${hit.license}`,
            imageSourceUrl: hit.pageUrl,
            imageCheckedAt: opts.now,
          })
          .where(eq(dish.id, d.id));
        found++;
        continue;
      }
    } catch (err) {
      // Geçici hata (ağ, zaman aşımı): "bulunamadı" sayma, bir sonraki çalışmada yeniden dene.
      console.error(`görsel: ${d.displayName}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    await db.update(dish).set({ imageCheckedAt: opts.now }).where(eq(dish.id, d.id));
  }
  return { checked: todo.length, found };
}

// --- Gerçek Wikimedia Commons erişimi ---

const UA = "yersen/1.0 (https://yersen.aegis.net.tr; ogrenci projesi)";

export const commons: ImageDeps = {
  search: async (query) => {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: `${query} filetype:bitmap`,
      gsrlimit: "5",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "800",
      iiextmetadatafilter: "LicenseShortName|Artist",
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
    type Page = {
      title: string;
      index?: number;
      imageinfo?: { thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[];
    };
    const data = (await res.json()) as { query?: { pages?: Record<string, Page> } };
    return Object.values(data.query?.pages ?? {})
      .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
      .flatMap((p) => {
        const ii = p.imageinfo?.[0];
        if (!ii?.thumburl || !ii.descriptionurl) return [];
        const meta = ii.extmetadata ?? {};
        const artist = stripTags(meta.Artist?.value ?? "").slice(0, 80) || "Wikimedia Commons";
        return [{ title: p.title, thumbUrl: ii.thumburl, pageUrl: ii.descriptionurl, artist, license: meta.LicenseShortName?.value ?? "" }];
      });
  },
  download: async (url) => {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`indirme HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
};

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
