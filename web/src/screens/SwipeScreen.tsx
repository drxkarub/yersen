import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { DayMenuView, MenuItemView, SwipeChoice } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import { displayName } from "../format.ts";
import { formatDay, formatScore } from "./Today.tsx";
import "./Screens.css";

type Card = MenuItemView & { date: string };
const THRESHOLD = 90; // px: bu kadar sürüklenince karar verilir
const CHOICE_LABEL: Record<SwipeChoice, string> = { yes: "Yerim", maybe: "Belki", no: "Yemem" };

/** Önümüzdeki günlerin yemekleri: önce kararı verilmemiş deste, altında kararlarım. */
export function SwipeScreen() {
  const [days, setDays] = useState<DayMenuView[] | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.upcoming().then((r) => setDays(r.days), () => setDays("error"));
  }, []);

  if (days === null) return <main className="bugun" aria-busy="true" />;
  if (days === "error")
    return (
      <main className="bugun">
        <section className="fis fis-durum">
          <h1>Günler yüklenemedi</h1>
          <p>{errorText(null)}</p>
        </section>
      </main>
    );

  const cards: Card[] = days.flatMap((d) => d.items.map((i) => ({ ...i, date: d.date })));
  const openDays = new Set(days.filter((d) => d.ratingOpen).map((d) => d.date));
  const deck = cards.filter((c) => c.myChoice === null && !openDays.has(c.date));

  const decide = async (card: Card, choice: SwipeChoice) => {
    setError(null);
    const prev = days;
    setDays(days.map((d) => ({ ...d, items: d.items.map((i) => (i.menuItemId === card.menuItemId ? { ...i, myChoice: choice } : i)) })));
    try {
      await api.swipe(card.menuItemId, choice);
    } catch (err) {
      setDays(prev);
      setError(errorText(err));
    }
  };

  return (
    <main className="bugun">
      {deck.length > 0 ? (
        <Deck card={deck[0]!} remaining={deck.length} onDecide={(c, ch) => void decide(c, ch)} />
      ) : (
        <section className="fis fis-durum">
          <span className="durum-muhru" aria-hidden="true">
            Tamam
          </span>
          <h1>Hepsini kaydırdın</h1>
          <p>{cards.length === 0 ? "Önümüzdeki günlerin menüsü henüz yok." : "Fikrin değişirse aşağıdan düzeltebilirsin."}</p>
        </section>
      )}

      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}

      {cards.some((c) => c.myChoice !== null) && (
        <section className="ek" aria-labelledby="kararlar-baslik">
          <h2 id="kararlar-baslik">Kararlarım</h2>
          {days.map((d) => {
            const decided = d.items.filter((i) => i.myChoice !== null);
            if (decided.length === 0) return null;
            return (
              <div key={d.date} className="karar-gun">
                <h3>{formatDay(d.date)}</h3>
                <ul className="ek-liste">
                  {decided.map((i) => (
                    <li key={i.menuItemId} className="karar">
                      <span>{displayName(i.rawName)}</span>
                      <span className="karar-tuslar" role="group" aria-label={`${displayName(i.rawName)} kararı`}>
                        {(["yes", "maybe", "no"] as const).map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            aria-pressed={i.myChoice === ch}
                            onClick={() => void decide({ ...i, date: d.date }, ch)}
                          >
                            {CHOICE_LABEL[ch]}
                          </button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

function Deck({ card, remaining, onDecide }: { card: Card; remaining: number; onDecide: (c: Card, ch: SwipeChoice) => void }) {
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);

  const down = (e: PointerEvent) => {
    start.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (start.current !== null) setDx(e.clientX - start.current);
  };
  const up = () => {
    if (dx > THRESHOLD) onDecide(card, "yes");
    else if (dx < -THRESHOLD) onDecide(card, "no");
    start.current = null;
    setDx(0);
  };

  const hint = dx > THRESHOLD / 2 ? "yes" : dx < -THRESHOLD / 2 ? "no" : null;

  return (
    <section className="deste" aria-labelledby="kart-ad">
      <p className="deste-sayac">{remaining} yemek kararını bekliyor</p>
      <div
        className="kart fis"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span className="kart-gun">{formatDay(card.date)}</span>
        <h1 id="kart-ad" className="kart-ad">
          {displayName(card.rawName)}
        </h1>
        <p className="kart-puan">
          {card.average === null ? "Henüz puanlanmadı" : `${formatScore(card.average)} ortalama, ${card.votes} kişi`}
        </p>
        {hint && (
          <span className={`kart-damga kart-damga-${hint}`} aria-hidden="true">
            {CHOICE_LABEL[hint]}
          </span>
        )}
      </div>
      <div className="deste-tuslar">
        <button type="button" className="dugme dugme-ikincil" onClick={() => onDecide(card, "no")}>
          Yemem
        </button>
        <button type="button" className="dugme dugme-ikincil" onClick={() => onDecide(card, "maybe")}>
          Belki
        </button>
        <button type="button" className="dugme" onClick={() => onDecide(card, "yes")}>
          Yerim
        </button>
      </div>
    </section>
  );
}
