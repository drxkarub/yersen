import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Hand, ListChecks, X } from "lucide-react";
import { CATEGORY_LABEL, type DayMenuView, type MenuItemView, type SwipeChoice } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import { DishVisual } from "../DishVisual.tsx";
import { displayName } from "../format.ts";
import { formatDay, formatScore } from "./Today.tsx";
import "./Screens.css";

type Card = MenuItemView & { date: string };
// Sağa: yerim, sola: yemem, aşağı: belki. Bu kadar px sürüklenince karar verilir.
const THRESHOLD = 90;
const CHOICE_LABEL: Record<SwipeChoice, string> = { yes: "Yerim", maybe: "Belki", no: "Yemem" };
const NEAR_DAYS = 3; // destenin ilk bölümü: sıradaki kaç yemekhane günü

// Kaydırma gösterimi (Reels'teki gibi): kişi bir kez kendisi kaydırana kadar ilk kartta oynar.
// Sadece bu tarayıcıda hatırlanır; okunamazsa gösterim yine oynar, zararı yok.
const LEARNED_KEY = "yersen.kaydirmaOgrenildi";
function swipeLearned(): boolean {
  try {
    return localStorage.getItem(LEARNED_KEY) === "1";
  } catch {
    return false;
  }
}
function markSwipeLearned() {
  try {
    localStorage.setItem(LEARNED_KEY, "1");
  } catch {
    // gizli pencere vb.: bir dahaki sefer yine gösterilir
  }
}

/**
 * Kaydır sekmesi. Karar bekleyen yemek varsa tam ekran deste (reels gibi), yoksa ya da
 * "Kararlarım"a geçilince liste. Puanlaması açık gün (bugün) Bugün ekranındadır, destede yer almaz.
 * Deste önce yakın günleri verir; bitince ayın kalanına devam edilebilir.
 */
export function SwipeScreen() {
  const [days, setDays] = useState<DayMenuView[] | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"deste" | "liste">("deste");
  const [more, setMore] = useState(false); // "Sonraki günlere devam et" basıldı mı
  // "Baştan kaydır": bu turda yeniden karar verilen kartlar. null: normal deste (sadece kararsızlar).
  const [redo, setRedo] = useState<Set<number> | null>(null);

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

  // Deste: puanlaması açılmamış günler, sadece ana yemek ve tatlı. Önce yakın günler
  // (bugün 11:30'a kadar + sıradaki NEAR_DAYS yemekhane günü); bitince istenirse ayın kalanı.
  const today = istanbulToday(new Date());
  const pending = days.filter((d) => !d.ratingOpen);
  const nearDates = new Set(pending.filter((d) => d.date > today).slice(0, NEAR_DAYS).map((d) => d.date));
  const isNear = (d: DayMenuView) => d.date === today || nearDates.has(d.date);
  const deckDays = more ? pending : pending.filter(isNear);
  const toCards = (ds: DayMenuView[]): Card[] => ds.flatMap((d) => d.items.filter((i) => i.inDeck).map((i) => ({ ...i, date: d.date })));
  const cards = toCards(deckDays);
  const deck = redo ? cards.filter((c) => !redo.has(c.menuItemId)) : cards.filter((c) => c.myChoice === null);
  const allCards = toCards(pending);
  const laterWaiting = more ? 0 : toCards(pending.filter((d) => !isNear(d))).filter((c) => c.myChoice === null).length;

  const decide = async (card: Card, choice: SwipeChoice) => {
    setError(null);
    if (redo) setRedo(new Set(redo).add(card.menuItemId));
    const prev = days;
    setDays(days.map((d) => ({ ...d, items: d.items.map((i) => (i.menuItemId === card.menuItemId ? { ...i, myChoice: choice } : i)) })));
    try {
      await api.swipe(card.menuItemId, choice);
    } catch (err) {
      setDays(prev);
      setError(errorText(err));
    }
  };

  if (view === "deste" && deck.length > 0) {
    return (
      <FullScreenDeck
        card={deck[0]!}
        remaining={deck.length}
        error={error}
        onDecide={(c, ch) => void decide(c, ch)}
        onList={() => setView("liste")}
      />
    );
  }

  return (
    <main className="bugun">
      {deck.length > 0 ? (
        <button type="button" className="dugme" onClick={() => setView("deste")}>
          Kaydırmaya dön ({deck.length} yemek bekliyor)
        </button>
      ) : (
        <section className="fis fis-durum">
          <span className="durum-muhru" aria-hidden="true">
            Tamam
          </span>
          <h1>{laterWaiting > 0 ? "Yakın günler bitti" : "Hepsini kaydırdın"}</h1>
          <p>{allCards.length === 0 ? "Önümüzdeki günlerin menüsü henüz yok." : "Fikrin değişirse aşağıdan düzeltebilirsin."}</p>
        </section>
      )}

      {deck.length === 0 && allCards.length > 0 && (
        <button
          type="button"
          className="dugme dugme-ikincil"
          onClick={() => {
            // Baştan kaydırma ayın kalanını da kapsar: ileriki günlerdeki kararlar da değişebilsin.
            setMore(true);
            setRedo(new Set());
            setView("deste");
          }}
        >
          Baştan kaydır ({allCards.length} yemek)
        </button>
      )}

      {deck.length === 0 && laterWaiting > 0 && (
        <button
          type="button"
          className="dugme"
          onClick={() => {
            setMore(true);
            setRedo(null);
            setView("deste");
          }}
        >
          Sonraki günlere devam et ({laterWaiting} yemek)
        </button>
      )}

      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}

      {allCards.some((c) => c.myChoice !== null) && (
        <section className="ek" aria-labelledby="kararlar-baslik">
          <h2 id="kararlar-baslik">Kararlarım</h2>
          {pending.map((d) => {
            const decided = d.items.filter((i) => i.myChoice !== null && i.inDeck);
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
                          <button key={ch} type="button" aria-pressed={i.myChoice === ch} onClick={() => void decide({ ...i, date: d.date }, ch)}>
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

/** İstanbul'da bugünün tarihi (YYYY-MM-DD). */
function istanbulToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

function FullScreenDeck({
  card,
  remaining,
  error,
  onDecide,
  onList,
}: {
  card: Card;
  remaining: number;
  error: string | null;
  onDecide: (c: Card, ch: SwipeChoice) => void;
  onList: () => void;
}) {
  const [d, setD] = useState({ x: 0, y: 0 });
  const [demo, setDemo] = useState(() => !swipeLearned());
  const start = useRef<{ x: number; y: number } | null>(null);

  const down = (e: PointerEvent) => {
    setDemo(false); // dokununca gösterim durur, kart kişinin elinde
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (start.current) setD({ x: e.clientX - start.current.x, y: Math.max(0, e.clientY - start.current.y) });
  };
  const choiceFor = (limit: number): SwipeChoice | null => {
    if (Math.abs(d.x) >= d.y) return d.x > limit ? "yes" : d.x < -limit ? "no" : null;
    return d.y > limit ? "maybe" : null;
  };
  const up = () => {
    const choice = choiceFor(THRESHOLD);
    if (choice) {
      markSwipeLearned();
      onDecide(card, choice);
    }
    start.current = null;
    setD({ x: 0, y: 0 });
  };

  const hint = choiceFor(THRESHOLD / 2);
  const name = displayName(card.rawName);

  return (
    <div className="tam-ekran" role="dialog" aria-modal="true" aria-labelledby="kart-ad" data-demo={demo || undefined}>
      <div className="tam-ust">
        <a href="#bugun" className="ikon-dugme" aria-label="Kaydırmayı kapat">
          <X size={24} aria-hidden="true" />
        </a>
        <span className="tam-sayac">{remaining} yemek bekliyor</span>
        <button type="button" className="ikon-dugme" onClick={onList} aria-label="Kararlarım">
          <ListChecks size={24} aria-hidden="true" />
        </button>
      </div>

      <div className="kart-alan">
      <div
        className="kart fis"
        data-hint={hint ?? undefined}
        style={{ transform: `translate(${d.x}px, ${d.y}px) rotate(${d.x / 30}deg)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <DishVisual name={card.rawName} imageUrl={card.imageUrl} imageCredit={card.imageCredit} imageSourceUrl={card.imageSourceUrl} />
        <div className="kart-govde">
          <span className="kart-gun">
            {formatDay(card.date)}, {CATEGORY_LABEL[card.category].toLocaleLowerCase("tr-TR")}
          </span>
          <h1 id="kart-ad" className="kart-ad">
            {name}
          </h1>
          {card.myChoice && (
            <p className="kart-karar">
              Şu anki kararın: <b>{CHOICE_LABEL[card.myChoice]}</b>
            </p>
          )}
          <p className="kart-puan">
            {card.average === null ? "Henüz puanlanmadı" : `${formatScore(card.average)} ortalama, ${card.votes} kişi`}
          </p>
        </div>
      </div>

        {/* Yönler ekranın kenarlarında sabit, hep görünür; sürüklenen yön belirginleşir. */}
        <span className="yon yon-sol" data-on={hint === "no" || undefined} aria-hidden="true">
          <ArrowLeft size={18} /> Yemem
        </span>
        <span className="yon yon-sag" data-on={hint === "yes" || undefined} aria-hidden="true">
          Yerim <ArrowRight size={18} />
        </span>
        <span className="yon yon-alt" data-on={hint === "maybe" || undefined} aria-hidden="true">
          <ArrowDown size={18} /> Belki
        </span>

        {demo && (
          <div className="demo-el" aria-hidden="true">
            <Hand size={44} strokeWidth={1.75} />
            <span>Kartı kaydır</span>
          </div>
        )}
      </div>

      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}

      <div className="deste-tuslar" aria-label={`${name} için karar`}>
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
    </div>
  );
}
