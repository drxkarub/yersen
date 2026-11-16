import { parse, type HTMLElement, NodeType } from "node-html-parser";

export type MenuDay = {
  date: string; // YYYY-MM-DD
  dishes: string[]; // menüde yazdığı gibi, yalnızca baş/son boşluk temizlenmiş
  kcal: number | null; // günün toplamı
};

export type ParseResult =
  | { kind: "ok"; days: MenuDay[] }
  | { kind: "unpublished" } // tablo var, hücre yok: okul ayın menüsünü henüz koymamış
  | { kind: "broken"; reason: string }; // sayfa yapısı beklenenden farklı: alarm

const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const KCAL_RE = /(\d+)\s*Kal/i;

/**
 * trakya.edu.tr/yemeklistesi sayfasını ayrıştırır.
 * @param today Europe/Istanbul saat dilimine göre bugünün tarihi (YYYY-MM-DD). "BUGÜN" yazan hücrenin tarihi budur.
 */
export function parseMenuPage(html: string, today: string): ParseResult {
  const root = parse(html);
  const table = root.querySelector("#ylistTable");
  if (!table) return { kind: "broken", reason: "#ylistTable bulunamadı" };

  const cells = table.querySelectorAll(".mitem");
  if (cells.length === 0) return { kind: "unpublished" };

  const days: MenuDay[] = [];
  let todayIndex = -1;

  for (const [i, cell] of cells.entries()) {
    const heading = cell.querySelector("h4")?.text.trim();
    if (!heading) return { kind: "broken", reason: `${i + 1}. hücrede başlık (h4) yok` };

    let date: string;
    const m = DATE_RE.exec(heading);
    if (m) {
      date = `${m[3]}-${m[2]}-${m[1]}`;
    } else if (heading.toLocaleUpperCase("tr-TR") === "BUGÜN") {
      date = today;
      todayIndex = i;
    } else {
      return { kind: "broken", reason: `${i + 1}. hücrenin başlığı tarih değil: "${heading}"` };
    }

    const dishes = dishLines(cell);
    if (dishes.length === 0) return { kind: "broken", reason: `${date} için yemek satırı yok` };

    const kcalText = cell.querySelector("small")?.text ?? "";
    const k = KCAL_RE.exec(kcalText);
    days.push({ date, dishes, kcal: k ? Number(k[1]) : null });
  }

  // BUGÜN hücresi komşularının arasına oturmalı; oturmuyorsa ya saat dilimi ya sayfa yanlıştır.
  if (todayIndex >= 0) {
    const prev = days[todayIndex - 1]?.date;
    const next = days[todayIndex + 1]?.date;
    if ((prev && prev >= today) || (next && next <= today)) {
      return { kind: "broken", reason: `BUGÜN (${today}) komşu tarihlerle çelişiyor: ${prev ?? "-"} / ${next ?? "-"}` };
    }
  }

  for (let i = 1; i < days.length; i++) {
    if (days[i - 1]!.date >= days[i]!.date) {
      return { kind: "broken", reason: `tarihler sıralı değil: ${days[i - 1]!.date}, ${days[i]!.date}` };
    }
  }

  return { kind: "ok", days };
}

/** Hücredeki <br> ile ayrılmış yemek satırları; başlık (h4) ve kalori (small) hariç. */
function dishLines(cell: HTMLElement): string[] {
  const container = cell.querySelector("h4")?.parentNode ?? cell;
  const lines: string[] = [];
  let current = "";
  for (const node of container.childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      current += node.text;
      continue;
    }
    const tag = (node as HTMLElement).tagName;
    if (tag === "BR") {
      lines.push(current);
      current = "";
    } else if (tag !== "H4" && tag !== "SMALL") {
      current += node.text;
    }
  }
  lines.push(current);
  return lines.map((l) => l.trim()).filter((l) => l.length > 0);
}
