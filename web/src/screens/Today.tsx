import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORY_LABEL, type DayNavResponse, type MenuItemView, type SwipeChoice } from "@yersen/shared";
import { displayName } from "../format.ts";
import "./Today.css";
import "./Screens.css";

const LOW_VOTES = 5; // bunun altındaki puanlar soluk ve küçük basılır
const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type MyRating = number | "yemedim";

export type TodayActions = {
  rate: (item: MenuItemView, score: number) => Promise<string | null>; // hata metni ya da null
  skip: (item: MenuItemView) => Promise<string | null>;
};

/**
 * Bir günün fişi (varsayılan bugün). Üstte geri/ileri gezgini; menüsüz günde durum fişi.
 * Puanlama açıksa satıra dokunmak o yemeğin puan tuşlarını açar.
 */
export function Today({
  nav,
  now,
  actions,
  onGo,
}: {
  nav: DayNavResponse;
  now: Date;
  actions: TodayActions;
  onGo: (date: string) => void;
}) {
  const day = nav.day;
  const [mine, setMine] = useState<Record<number, MyRating>>(() =>
    Object.fromEntries((day?.items ?? []).filter((i) => i.myScore !== null).map((i) => [i.menuItemId, i.myScore!])),
  );
  const [items, setItems] = useState<MenuItemView[]>(day?.items ?? []);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gezgin = <DayNav nav={nav} onGo={onGo} />;
  if (!day) return <StatusTicket nav={nav} gezgin={gezgin} onGo={onGo} />;

  const waiting = !day.ratingOpen && now < new Date(day.opensAt);
  const nextUnrated = (after: Record<number, MyRating>) => items.find((i) => after[i.menuItemId] === undefined)?.menuItemId ?? null;

  const record = async (item: MenuItemView, value: MyRating) => {
    setError(null);
    const before = mine;
    const after = { ...mine, [item.menuItemId]: value };
    setMine(after); // mühür hemen basılır; sunucu reddederse geri alınır
    setActiveId(nextUnrated(after));
    const err = value === "yemedim" ? await actions.skip(item) : await actions.rate(item, value);
    if (err) {
      setMine(before);
      setActiveId(item.menuItemId);
      setError(err);
    } else if (typeof value === "number") {
      // Kendi puanın ortalamaya ve oy sayısına hemen yansısın.
      const old = typeof before[item.menuItemId] === "number" ? (before[item.menuItemId] as number) : null;
      setItems((list) => list.map((i) => (i.menuItemId === item.menuItemId ? withMyScore(i, old, value) : i)));
    }
  };

  const ratedCount = items.filter((i) => mine[i.menuItemId] !== undefined).length;
  const allRated = items.length > 0 && ratedCount === items.length;
  const dayAverage = weightedAverage(items);

  return (
    <main className="bugun">
      {gezgin}
      <section className="fis" aria-labelledby="fis-baslik">
        <div className="fis-bas">
          <h1 id="fis-baslik">{ticketTitle(day.date, nav.today)}</h1>
          <span className="fis-no">{formatDay(day.date)}</span>
        </div>

        {dayAverage !== null && (
          <div className="gun-muhru" role="img" aria-label={`Günün ortalaması ${formatScore(dayAverage)}`}>
            <b>{formatScore(dayAverage)}</b>
            <small>günün ortalaması</small>
          </div>
        )}

        <ol className="yemekler">
          {items.map((item) => {
            const my = mine[item.menuItemId];
            const isActive = activeId === item.menuItemId;
            return (
              <li key={item.menuItemId} className="yemek" data-active={isActive || undefined}>
                <Row
                  rateable={day.ratingOpen}
                  active={isActive}
                  label={`${displayName(item.rawName)} puanla`}
                  onTap={() => setActiveId(isActive ? null : item.menuItemId)}
                >
                  <span className="yemek-kategori">{CATEGORY_LABEL[item.category]}</span>
                  <span className="yemek-ad">{displayName(item.rawName)}</span>
                  {my !== undefined ? (
                    <MyStamp value={my} />
                  ) : day.ratingOpen ? (
                    !isActive && (
                      <span className="puanla-ipucu" aria-hidden="true">
                        Puanla
                      </span>
                    )
                  ) : (
                    item.myChoice && <ChoiceStamp choice={item.myChoice} />
                  )}
                  {item.average !== null && (
                    <span className="yemek-puan" data-az={item.votes < LOW_VOTES || undefined}>
                      {formatScore(item.average)}
                    </span>
                  )}
                  <span className="yemek-oy">{item.votes === 0 ? "Henüz puanlayan yok" : `${item.votes} kişi puanladı`}</span>
                </Row>

                {isActive && (
                  <fieldset className="olcek">
                    <legend>{displayName(item.rawName)} kaç puan?</legend>
                    <div className="olcek-tuslar">
                      {SCORES.map((s) => (
                        <button key={s} type="button" className="olcek-tus" onClick={() => void record(item, s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="yemedim" onClick={() => void record(item, "yemedim")}>
                      Bunu yemedim
                    </button>
                  </fieldset>
                )}
              </li>
            );
          })}
        </ol>

        <div className="fis-alt">
          <span>{day.kcal ? `${day.kcal} kcal, günün toplamı` : "Kalori bilgisi yok"}</span>
        </div>
      </section>

      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}

      <div className="eylem">
        {waiting ? (
          <p className="eylem-bilgi">
            {day.date === nav.today
              ? "Puanlama 11:30'da açılıyor. Önce ye, sonra konuş."
              : dayDiff(day.date, nav.today) === 1
                ? "Puanlama yarın 11:30'da açılır."
                : `Puanlama ${formatDay(day.date)} 11:30'da açılır.`}
          </p>
        ) : !day.ratingOpen ? (
          <p className="eylem-bilgi">Bu günün puanlaması kapandı.</p>
        ) : activeId !== null ? (
          <button type="button" className="dugme dugme-ikincil" onClick={() => setActiveId(null)}>
            Şimdilik bu kadar
          </button>
        ) : allRated ? (
          <>
            <p className="eylem-bilgi" role="status">
              Puanların fişe basıldı. Afiyet olsun.
            </p>
            <button type="button" className="dugme dugme-ikincil" onClick={() => setActiveId(items[0]?.menuItemId ?? null)}>
              Puanlarını değiştir
            </button>
          </>
        ) : (
          <button type="button" className="dugme" onClick={() => setActiveId(nextUnrated(mine))}>
            {ratedCount === 0 ? "Yedim, puanla" : "Puanlamaya devam et"}
          </button>
        )}
      </div>
    </main>
  );
}

function MyStamp({ value }: { value: MyRating }) {
  if (value === "yemedim") {
    return (
      <span className="benim-muhur benim-muhur-yemedim" aria-label="Senin kaydın: yemedin">
        yemedim
      </span>
    );
  }
  return (
    <span className="benim-muhur" aria-label={`Senin puanın ${value}`}>
      {value}
    </span>
  );
}

function StatusTicket({ nav, gezgin, onGo }: { nav: DayNavResponse; gezgin: ReactNode; onGo: (date: string) => void }) {
  const copy = nav.nextDate
    ? { stamp: "Kapalı", title: "Bugün yemekhane kapalı", body: "Evde ne varsa artık. Sıradaki menüye ileri okuyla bakabilirsin." }
    : { stamp: "Bekleniyor", title: "Menü henüz yayınlanmadı", body: "Okul menüyü daha koymadı. Biz her sabah bakıyoruz, gelir gelmez burada." };
  return (
    <main className="bugun">
      {gezgin}
      <section className="fis fis-durum" aria-labelledby="durum-baslik">
        <span className="durum-muhru" aria-hidden="true">
          {copy.stamp}
        </span>
        <h1 id="durum-baslik">{copy.title}</h1>
        <p>{copy.body}</p>
      </section>

      {nav.nextDate && (
        <div className="eylem">
          <button type="button" className="dugme" onClick={() => onGo(nav.nextDate!)}>
            {formatDay(nav.nextDate)} menüsü
          </button>
          <a className="dugme dugme-ikincil dugme-baglanti" href="#kaydir">
            Sıradaki günleri kaydır
          </a>
        </div>
      )}
    </main>
  );
}

/** Puanlama açıksa satır bir düğmedir; değilse düz satır. */
function Row({
  rateable,
  active,
  label,
  onTap,
  children,
}: {
  rateable: boolean;
  active: boolean;
  label: string;
  onTap: () => void;
  children: ReactNode;
}) {
  if (!rateable) return <div className="yemek-satir">{children}</div>;
  return (
    <button type="button" className="yemek-satir yemek-satir-dokun" aria-expanded={active} aria-label={label} onClick={onTap}>
      {children}
    </button>
  );
}

const CHOICE_STAMP: Record<SwipeChoice, string> = { yes: "yerim", maybe: "belki", no: "yemem" };

/** İleriki günde kaydırmadaki kararın. */
function ChoiceStamp({ choice }: { choice: SwipeChoice }) {
  return (
    <span className={`benim-muhur benim-muhur-metin${choice === "no" ? " benim-muhur-yemedim" : ""}`} aria-label={`Kararın: ${CHOICE_STAMP[choice]}`}>
      {CHOICE_STAMP[choice]}
    </span>
  );
}

/**
 * Geri/ileri gezgini. "Bugün" kısayolu bugünün olduğu tarafta durur: ilerideyken en solda,
 * gerideyken en sağda. Komşu gün zaten bugünse ayrıca gösterilmez.
 */
function DayNav({ nav, onGo }: { nav: DayNavResponse; onGo: (date: string) => void }) {
  const { date, today, prevDate, nextDate } = nav;
  const showToday = date !== today && prevDate !== today && nextDate !== today;
  const todayBtn = (
    <button type="button" className="gezgin-bugun" onClick={() => onGo(today)}>
      Bugün
    </button>
  );
  return (
    <nav className="gezgin" aria-label="Günler">
      {showToday && date > today && todayBtn}
      <button type="button" className="gezgin-ok" disabled={!prevDate} onClick={() => prevDate && onGo(prevDate)}>
        <ChevronLeft size={20} aria-hidden="true" />
        {prevDate ? relativeLabel(prevDate, today) : "Geri"}
      </button>
      <button type="button" className="gezgin-ok gezgin-ok-ileri" disabled={!nextDate} onClick={() => nextDate && onGo(nextDate)}>
        {nextDate ? relativeLabel(nextDate, today) : "İleri"}
        <ChevronRight size={20} aria-hidden="true" />
      </button>
      {showToday && date < today && todayBtn}
    </nav>
  );
}

function dayDiff(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** "Bugün", "Dün", "Yarın" ya da kısa tarih ("Pzt 23 Kas"). */
export function relativeLabel(date: string, today: string): string {
  const diff = dayDiff(date, today);
  if (diff === 0) return "Bugün";
  if (diff === -1) return "Dün";
  if (diff === 1) return "Yarın";
  const d = new Date(`${date}T00:00:00Z`);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("tr-TR", { ...o, timeZone: "UTC" }).format(d);
  return `${part({ weekday: "short" })} ${part({ day: "numeric" })} ${part({ month: "short" })}`; // "Cum 20 Kas"
}

function ticketTitle(date: string, today: string): string {
  const diff = dayDiff(date, today);
  if (diff === 0) return "Bugünün fişi";
  if (diff === -1) return "Dünün fişi";
  if (diff === 1) return "Yarının fişi";
  const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  return `${weekday.charAt(0).toLocaleUpperCase("tr-TR")}${weekday.slice(1)} fişi`;
}

/** Ortalama ve oy sayısını kullanıcının yeni (ya da değişen) puanıyla günceller. */
function withMyScore(i: MenuItemView, old: number | null, score: number): MenuItemView {
  const total = (i.average ?? 0) * i.votes;
  if (old === null) return { ...i, votes: i.votes + 1, average: (total + score) / (i.votes + 1), myScore: score };
  return { ...i, average: i.votes > 0 ? (total - old + score) / i.votes : score, myScore: score };
}

function weightedAverage(items: MenuItemView[]): number | null {
  let sum = 0;
  let votes = 0;
  for (const i of items) {
    if (i.average === null) continue;
    sum += i.average * i.votes;
    votes += i.votes;
  }
  return votes === 0 ? null : sum / votes;
}

export function formatScore(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
