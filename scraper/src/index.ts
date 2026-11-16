// Scraper giriş noktası. Sunucuda systemd timer çalıştırır (07:00 ve 10:00 İstanbul):
//   docker compose -f /opt/yersen/docker-compose.yml run --rm scraper
// Ortam: DATABASE_URL (zorunlu), HEALTHCHECKS_SCRAPER_URL (isteğe bağlı; yoksa yalnızca konsola yazar).
import { createDb } from "@yersen/api/db";
import { MENU_URL, runScrape, type Ping } from "./run.ts";

const TIMEOUT_MS = 30_000;
const hcUrl = process.env.HEALTHCHECKS_SCRAPER_URL?.replace(/\/+$/, "");

async function hc(path: string, body?: string) {
  if (!hcUrl) return;
  await fetch(`${hcUrl}${path}`, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
}

const ping: Ping = (kind, message) => hc(kind === "fail" ? "/fail" : "", message);

async function fetchHtml(): Promise<string> {
  const res = await fetch(MENU_URL, {
    headers: { "User-Agent": "yersen-scraper (+https://yersen.aegis.net.tr)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${MENU_URL} HTTP ${res.status}`);
  return res.text();
}

await hc("/start").catch(() => {});
const db = await createDb(process.env.DATABASE_URL || undefined);
const result = await runScrape({ db, now: new Date(), fetchHtml, ping });
console.log(result.message);
process.exit(result.exitCode);
