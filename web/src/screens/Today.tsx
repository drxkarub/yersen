import { useState } from "react";
import { displayName, type DayMenu, type Dish } from "../sample.ts";
import "./Today.css";

export type TodayStatus =
  | "acik" // menü var, puanlama penceresi açık
  | "bekliyor" // menü var, puanlama 11:30'da açılacak
  | "kapali" // hafta sonu ya da tatil
  | "yayinlanmadi"; // okul ayın menüsünü henüz koymadı

const LOW_VOTES = 5; // bunun altındaki puanlar soluk ve küçük basılır
const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type MyRating = number | "yemedim";

export function Today({
  menu,
  status,
  extra,
  demo,
}: {
  menu: DayMenu;
  status: TodayStatus;
  extra: ExtraList; // kapalıyken sıradaki menü, yayınlanmadıysa geçen ayın en iyileri
  demo: boolean;
}) {
  const [ratings, setRatings] = useState<Record<string, MyRating>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  if (status === "kapali" || status === "yayinlanmadi") {
    return <StatusTicket status={status} extra={extra} demo={demo} />;
  }

  const nextUnrated = (after: Record<string, MyRating>) => menu.dishes.find((d) => after[d.id] === undefined)?.id ?? null;
  const rate = (dish: Dish, value: MyRating) => {
    const next = { ...ratings, [dish.id]: value };
    setRatings(next);
    setActiveId(nextUnrated(next));
  };
  const ratedCount = Object.keys(ratings).length;
  const allRated = ratedCount === menu.dishes.length;
  const dayAverage = weightedAverage(menu.dishes);

  return (
    <main className="bugun">
      <section className="fis" aria-labelledby="fis-baslik">
        <div className="fis-bas">
          <h1 id="fis-baslik">Bugünün fişi</h1>
          <span className="fis-no">No {String(menu.ticketNo).padStart(4, "0")}</span>
        </div>

        {dayAverage !== null && (
          <div className="gun-muhru" role="img" aria-label={`Günün ortalaması ${formatScore(dayAverage)}`}>
            <b>{formatScore(dayAverage)}</b>
            <small>günün ortalaması</small>
          </div>
        )}

        <ol className="yemekler">
          {menu.dishes.map((dish) => {
            const mine = ratings[dish.id];
            const isActive = activeId === dish.id;
            return (
              <li key={dish.id} className="yemek" data-active={isActive || undefined}>
                <div className="yemek-satir">
                  <span className="yemek-ad">{displayName(dish.rawName)}</span>
                  {mine !== undefined && <MyStamp value={mine} />}
                  {dish.average !== null && (
                    <span className="yemek-puan" data-az={dish.votes < LOW_VOTES || undefined}>
                      {formatScore(dish.average)}
                    </span>
                  )}
                  <span className="yemek-oy">
                    {dish.votes === 0 ? "Henüz puanlayan yok" : `${dish.votes} kişi puanladı`}
                  </span>
                </div>

                {isActive && (
                  <fieldset className="olcek">
                    <legend>{displayName(dish.rawName)} kaç puan?</legend>
                    <div className="olcek-tuslar">
                      {SCORES.map((s) => (
                        <button key={s} type="button" className="olcek-tus" onClick={() => rate(dish, s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="yemedim" onClick={() => rate(dish, "yemedim")}>
                      Bunu yemedim
                    </button>
                  </fieldset>
                )}
              </li>
            );
          })}
        </ol>

        <div className="fis-alt">
          <span>{menu.kcal} kcal, günün toplamı</span>
          {demo && <span className="ornek">Örnek veri</span>}
        </div>
      </section>

      <div className="eylem">
        {status === "bekliyor" ? (
          <p className="eylem-bilgi">Puanlama 11:30'da açılıyor. Önce ye, sonra konuş.</p>
        ) : activeId !== null ? (
          <button type="button" className="dugme dugme-ikincil" onClick={() => setActiveId(null)}>
            Şimdilik bu kadar
          </button>
        ) : allRated ? (
          <>
            <p className="eylem-bilgi" role="status">Puanların fişe basıldı. Afiyet olsun.</p>
            <button type="button" className="dugme dugme-ikincil" onClick={() => setActiveId(menu.dishes[0]?.id ?? null)}>
              Puanlarını değiştir
            </button>
          </>
        ) : (
          <button type="button" className="dugme" onClick={() => setActiveId(nextUnrated(ratings))}>
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

function StatusTicket({ status, extra, demo }: { status: "kapali" | "yayinlanmadi"; extra: ExtraList; demo: boolean }) {
  const copy =
    status === "kapali"
      ? {
          stamp: "Kapalı",
          title: "Bugün yemekhane kapalı",
          body: "Evde ne varsa artık. Sıradaki menü aşağıda, kaydırmaya şimdiden başlayabilirsin.",
        }
      : {
          stamp: "Bekleniyor",
          title: "Menü henüz yayınlanmadı",
          body: "Okul bu ayın menüsünü daha koymadı. Biz her sabah bakıyoruz, gelir gelmez burada.",
        };
  return (
    <main className="bugun">
      <section className="fis fis-durum" aria-labelledby="durum-baslik">
        <span className="durum-muhru" aria-hidden="true">
          {copy.stamp}
        </span>
        <h1 id="durum-baslik">{copy.title}</h1>
        <p>{copy.body}</p>
      </section>

      <section className="ek" aria-labelledby="ek-baslik">
        <h2 id="ek-baslik">{extra.title}</h2>
        <ul className="ek-liste">
          {extra.dishes.map((d) => (
            <li key={d.id}>
              <span>{displayName(d.rawName)}</span>
              {extra.showScores && d.average !== null && (
                <span className="yemek-puan" data-az={d.votes < LOW_VOTES || undefined}>
                  {formatScore(d.average)}
                </span>
              )}
            </li>
          ))}
        </ul>
        {demo && <p className="ek-not">Örnek veri</p>}
      </section>

      {status === "kapali" && (
        <div className="eylem">
          <a className="dugme dugme-ikincil dugme-baglanti" href="#kaydir">
            Sıradaki günleri kaydır
          </a>
        </div>
      )}
    </main>
  );
}

/** showScores: sıradaki menüde false, çünkü henüz kimse yemedi. */
export type ExtraList = { title: string; dishes: Dish[]; showScores: boolean };

function weightedAverage(dishes: Dish[]): number | null {
  let sum = 0;
  let votes = 0;
  for (const d of dishes) {
    if (d.average === null) continue;
    sum += d.average * d.votes;
    votes += d.votes;
  }
  return votes === 0 ? null : sum / votes;
}

function formatScore(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
