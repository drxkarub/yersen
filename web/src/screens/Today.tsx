import { useState } from "react";
import type { DayMenuView, MenuItemView } from "@yersen/shared";
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

/** Bugünün fişi. Gün menüsü yoksa durum fişi (kapalı / yayınlanmadı) gösterilir. */
export function Today({
  day,
  next,
  now,
  actions,
}: {
  day: DayMenuView | null;
  next: DayMenuView | null;
  now: Date;
  actions: TodayActions;
}) {
  const [mine, setMine] = useState<Record<number, MyRating>>(() =>
    Object.fromEntries((day?.items ?? []).filter((i) => i.myScore !== null).map((i) => [i.menuItemId, i.myScore!])),
  );
  const [items, setItems] = useState<MenuItemView[]>(day?.items ?? []);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!day) return <StatusTicket next={next} />;

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
      <section className="fis" aria-labelledby="fis-baslik">
        <div className="fis-bas">
          <h1 id="fis-baslik">Bugünün fişi</h1>
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
                <div className="yemek-satir">
                  <span className="yemek-ad">{displayName(item.rawName)}</span>
                  {my !== undefined && <MyStamp value={my} />}
                  {item.average !== null && (
                    <span className="yemek-puan" data-az={item.votes < LOW_VOTES || undefined}>
                      {formatScore(item.average)}
                    </span>
                  )}
                  <span className="yemek-oy">{item.votes === 0 ? "Henüz puanlayan yok" : `${item.votes} kişi puanladı`}</span>
                </div>

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
          <p className="eylem-bilgi">Puanlama 11:30'da açılıyor. Önce ye, sonra konuş.</p>
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

function StatusTicket({ next }: { next: DayMenuView | null }) {
  const copy = next
    ? { stamp: "Kapalı", title: "Bugün yemekhane kapalı", body: "Evde ne varsa artık. Sıradaki menü aşağıda, kaydırmaya şimdiden başlayabilirsin." }
    : { stamp: "Bekleniyor", title: "Menü henüz yayınlanmadı", body: "Okul menüyü daha koymadı. Biz her sabah bakıyoruz, gelir gelmez burada." };
  return (
    <main className="bugun">
      <section className="fis fis-durum" aria-labelledby="durum-baslik">
        <span className="durum-muhru" aria-hidden="true">
          {copy.stamp}
        </span>
        <h1 id="durum-baslik">{copy.title}</h1>
        <p>{copy.body}</p>
      </section>

      {next && (
        <section className="ek" aria-labelledby="ek-baslik">
          <h2 id="ek-baslik">{formatDay(next.date)} menüsü</h2>
          <ul className="ek-liste">
            {next.items.map((d) => (
              <li key={d.menuItemId}>
                <span>{displayName(d.rawName)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {next && (
        <div className="eylem">
          <a className="dugme dugme-ikincil dugme-baglanti" href="#kaydir">
            Sıradaki günleri kaydır
          </a>
        </div>
      )}
    </main>
  );
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
