import type { Db } from "@yersen/api/db";
import { storeMenuDays } from "@yersen/api/menu-store";
import { istanbulDate } from "@yersen/api/time";
import { parseMenuPage } from "./parse.ts";

export const VENUE_SLUG = "trakya-merkez";
export const MENU_URL = "https://www.trakya.edu.tr/yemeklistesi";

/** healthchecks.io'ya sonuç bildirir. Hata fırlatabilir; runScrape bunu yutar. */
export type Ping = (kind: "success" | "fail", message: string) => Promise<void>;

export async function runScrape(deps: {
  db: Db;
  now: Date;
  fetchHtml: () => Promise<string>;
  ping: Ping;
}): Promise<{ exitCode: 0 | 1; message: string }> {
  let result: { exitCode: 0 | 1; message: string };
  try {
    const html = await deps.fetchHtml();
    const parsed = parseMenuPage(html, istanbulDate(deps.now));
    if (parsed.kind === "broken") {
      result = { exitCode: 1, message: `Sayfa yapısı beklenenden farklı: ${parsed.reason}` };
    } else if (parsed.kind === "unpublished") {
      result = { exitCode: 0, message: "Bu ayın menüsü henüz yayınlanmadı; yarın tekrar denenecek." };
    } else {
      const stored = await storeMenuDays(deps.db, VENUE_SLUG, parsed.days);
      const first = parsed.days[0]!.date;
      const last = parsed.days.at(-1)!.date;
      result = {
        exitCode: 0,
        message: `${stored.menus} gün kaydedildi (${first} – ${last}), ${stored.items} kalem, ${stored.newDishes} yeni yemek.`,
      };
    }
  } catch (err) {
    result = { exitCode: 1, message: `Scraper hatası: ${err instanceof Error ? err.message : String(err)}` };
  }

  try {
    await deps.ping(result.exitCode === 0 ? "success" : "fail", result.message);
  } catch (err) {
    console.error(`healthchecks bildirimi gönderilemedi: ${err instanceof Error ? err.message : String(err)}`);
  }
  return result;
}
