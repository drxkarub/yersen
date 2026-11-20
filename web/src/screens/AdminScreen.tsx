import { useEffect, useState, type FormEvent } from "react";
import { api, errorText } from "../api.ts";
import { DishVisual } from "../DishVisual.tsx";
import { displayName } from "../format.ts";
import "./Screens.css";

type Overview = Awaited<ReturnType<typeof api.admin.overview>>;
type User = Awaited<ReturnType<typeof api.admin.users>>["users"][number];
type Dish = Awaited<ReturnType<typeof api.admin.dishes>>["dishes"][number];

const when = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(new Date(iso));

/** Yönetim: moderatör yemek görsellerini görür; admin ayrıca kullanıcıları. Kök davet kodları sunucu CLI'ından. */
export function AdminScreen() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.overview().then(setOverview, (err) => setError(errorText(err)));
  }, []);

  if (error)
    return (
      <main className="bugun">
        <p className="hata" role="alert">
          {error}
        </p>
      </main>
    );
  if (!overview) return <main className="bugun" aria-busy="true" />;

  return (
    <main className="bugun yonetim">
      <ScraperRuns runs={overview.scrapeRuns} />
      {overview.role === "admin" && <Users />}
      <DishImages />
    </main>
  );
}

// "0 yeni yemek" gibi her gün aynı olan satırlar gürültü: son çalışma tek satır,
// öncekilerden yalnızca hata verenler ya da yeni yemek getirenler.
const newDishes = (message: string) => Number(/(\d+) yeni yemek/.exec(message)?.[1] ?? 0);
const tidy = (message: string) => message.replace(/, 0 yeni yemek\./, ".");

function ScraperRuns({ runs }: { runs: Overview["scrapeRuns"] }) {
  const [last, ...older] = runs;
  const notable = older.filter((r) => !r.ok || newDishes(r.message) > 0);
  return (
    <section className="fis" aria-labelledby="scraper-baslik">
      <h2 id="scraper-baslik" className="alt-baslik">
        Scraper
      </h2>
      {!last ? (
        <p className="form-aciklama">Henüz çalışma kaydı yok. Zamanlayıcı her gün 07:00 ve 10:00'da çalışır.</p>
      ) : (
        <ul className="kayitlar">
          {[last, ...notable].map((r) => (
            <li key={r.id} data-hata={!r.ok || undefined}>
              <span className="kayit-zaman">{when(r.at)}</span>
              <span>{r.ok ? tidy(r.message) : `Hata: ${r.message}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Users() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => api.admin.users().then((r) => setUsers(r.users), (err) => setError(errorText(err)));
  useEffect(() => {
    void load();
  }, []);

  const toggle = async (u: User) => {
    setError(null);
    try {
      await api.admin.setModerator(u.id, u.role !== "moderator");
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <section className="fis" aria-labelledby="kullanicilar-baslik">
      <h2 id="kullanicilar-baslik" className="alt-baslik">
        Kullanıcılar {users && <span className="sayi">({users.length})</span>}
      </h2>
      {error && <p className="hata">{error}</p>}
      <ul className="kayitlar">
        {users?.map((u) => (
          <li key={u.id} className="kullanici">
            <span>
              <strong>{u.nickname}</strong>
              <small>
                {u.role === "admin" ? "yönetici" : u.role === "moderator" ? "moderatör" : "kullanıcı"}
                {u.invitedBy ? `, ${u.invitedBy} davet etti` : ""}
              </small>
            </span>
            {u.role !== "admin" && (
              <button type="button" className="kod-paylas" onClick={() => void toggle(u)}>
                {u.role === "moderator" ? "Moderatörlüğü al" : "Moderatör yap"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DishImages() {
  const [q, setQ] = useState("");
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    try {
      setDishes((await api.admin.dishes(q)).dishes);
    } catch (err) {
      setError(errorText(err));
    }
  };
  useEffect(() => {
    void search();
    // yalnızca açılışta tüm liste
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (id: number, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await search();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="fis" aria-labelledby="gorsel-baslik">
      <h2 id="gorsel-baslik" className="alt-baslik">
        Yemek görselleri
      </h2>
      <p className="form-aciklama">Yanlış ya da alakasız görseli değiştir veya kaldır. Yüklediğin fotoğraftan konum bilgisi silinir.</p>
      <form className="satir-form" onSubmit={(e) => void search(e)}>
        <label className="alan alan-genis">
          <span className="sr-only">Yemek ara</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yemek ara: nohut, erişte…" />
        </label>
        <button type="submit" className="dugme dugme-ikincil">
          Ara
        </button>
      </form>
      {error && <p className="hata">{error}</p>}
      <ul className="yemek-gorselleri">
        {dishes?.map((d) => (
          <li key={d.id} aria-busy={busyId === d.id || undefined}>
            <div className="mini-gorsel">
              <DishVisual name={d.displayName} imageUrl={d.imageUrl} imageCredit={null} imageSourceUrl={null} />
            </div>
            <div className="mini-govde">
              <strong>{displayName(d.displayName)}</strong>
              <small>{d.imageUrl ? (d.imageCredit ?? "") : d.imageLocked ? "Görsel kaldırıldı (ikon)" : "Görsel yok"}</small>
              <span className="mini-tuslar">
                <label className="kod-paylas dosya-sec">
                  Fotoğraf yükle
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void run(d.id, () => api.admin.uploadDishImage(d.id, f));
                      e.target.value = "";
                    }}
                  />
                </label>
                {d.imageUrl && (
                  <button type="button" className="kod-paylas" onClick={() => void run(d.id, () => api.admin.removeDishImage(d.id))}>
                    Kaldır
                  </button>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
