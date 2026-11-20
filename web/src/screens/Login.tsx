import { useState } from "react";
import { Camera } from "lucide-react";
import { prettyCode } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import { inAppBrowser, pendingInvite } from "../invite.ts";
import "./Today.css";
import "./Screens.css";

// Tanıtım fişi: gerçek veri değil, "Örnek" damgasıyla işaretli.
const SAMPLE = [
  { kind: "Çorba", name: "Mercimek çorba", score: "8,4", votes: 41 },
  { kind: "Ana yemek", name: "Etli nohut", score: "8,1", votes: 37 },
  { kind: "Pilav/makarna", name: "Pirinç pilavı", score: "7,2", votes: 35 },
  { kind: "Tatlı/salata/içecek", name: "Ayran", score: "7,9", votes: 29 },
];

export function Login() {
  const [busy, setBusy] = useState(false);
  const [invite] = useState(pendingInvite);
  const [embedded] = useState(inAppBrowser);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.signInWithGoogle();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <main className="bugun tanitim">
      <section className="fis fis-durum" aria-labelledby="giris-baslik">
        <span className="durum-muhru" aria-hidden="true">
          Davetli
        </span>
        <h1 id="giris-baslik">Yersen gel puanla, yemezsen keyfin bilir</h1>
        <p>
          Trakya yemekhanesinin her günkü menüsü, öğrencilerin verdiği puanlar ve senin hükmün. Gitmeden önce bak, yedikten sonra
          puanla.
        </p>
        {invite && (
          <p className="davet-hazir">
            Davet kodun: <strong className="kod">{prettyCode(invite)}</strong>
          </p>
        )}
      </section>

      <h2 className="tanitim-baslik">İçeride ne var?</h2>

      {/* Uydurma değil ama gerçek de değil: örnek olduğu damgayla belli. */}
      <section className="fis tanitim-fis" aria-labelledby="ornek-baslik">
        <div className="fis-bas">
          <div>
            <h3 id="ornek-baslik">Bugünün fişi</h3>
            <span className="ornek-damga" aria-label="Örnek, gerçek veri değil">
              Örnek
            </span>
          </div>
        </div>
        <div className="gun-muhru" aria-hidden="true">
          <b>7,9</b>
          <small>günün ortalaması</small>
        </div>
        <ol className="yemekler" aria-label="Örnek menü">
          {SAMPLE.map((d) => (
            <li key={d.name} className="yemek">
              <div className="yemek-satir">
                <span className="yemek-kategori">{d.kind}</span>
                <span className="yemek-ad">{d.name}</span>
                <span className="yemek-puan">{d.score}</span>
                <span className="yemek-oy">{d.votes} kişi puanladı</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="tanitim-not">Menü okulun sitesinden her sabah kendiliğinden gelir. Dünün ve önümüzdeki günlerin fişine de bakabilirsin.</p>
      </section>

      <ul className="tanitim-ozellik">
        <li className="fis">
          <div className="tanitim-gorsel" aria-hidden="true">
            <span className="benim-muhur benim-muhur-metin">yerim</span>
            <span className="benim-muhur benim-muhur-metin benim-muhur-yemedim">yemem</span>
          </div>
          <h3>Gelecek günleri kaydır</h3>
          <p>Önümüzdeki günlerin yemeklerini sağa ya da sola kaydır: yerim, yemem, belki. Kimin ne dediği görünmez, yalnızca sen bilirsin.</p>
        </li>
        <li className="fis">
          <div className="tanitim-gorsel tanitim-olcek" aria-hidden="true">
            {[6, 7, 8, 9, 10].map((n) => (
              <span key={n} data-secili={n === 8 || undefined}>
                {n}
              </span>
            ))}
          </div>
          <h3>Yedikten sonra puanla</h3>
          <p>Saat 11:30'dan ertesi gün 11:30'a kadar her yemeğe 1-10 arası puan ver. Ortalama herkese açık; kimin kaç verdiği değil.</p>
        </li>
        <li className="fis">
          <div className="tanitim-gorsel" aria-hidden="true">
            <span className="tanitim-ikon">
              <Camera size={22} />
            </span>
          </div>
          <h3>Gelen tepsiyi gör</h3>
          <p>Menüde yazanla tepsiye geleni karşılaştır: ekip o günün tepsisinin fotoğrafını menünün altına ekler.</p>
        </li>
      </ul>

      <section className="fis tanitim-adimlar" aria-labelledby="nasil-baslik">
        <h2 id="nasil-baslik">Nasıl girilir?</h2>
        <ol>
          <li>
            <span><b>Davet al.</b> İçeride olan bir arkadaşından davet linki iste; her kod bir kişiyi içeri alır.</span>
          </li>
          <li>
            <span><b>Google ile giriş yap.</b> Linkten geldiysen kodun hazır gelir.</span>
          </li>
          <li>
            <span><b>Takma adını seç.</b> Gerçek adın ve e-postan kimseye gösterilmez.</span>
          </li>
        </ol>
      </section>

      {embedded && (
        <p className="uyari" role="note">
          Google, uygulama içindeki tarayıcıdan girişe izin vermiyor. Sağ üstteki menüden “Tarayıcıda aç”ı seç; davet kodun orada da hazır olur.
        </p>
      )}
      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}
      <div className="eylem tanitim-eylem">
        <button type="button" className="dugme" onClick={() => void signIn()} disabled={busy}>
          {busy ? "Google'a gidiyor…" : "Google ile giriş yap"}
        </button>
        <p className="dipnot">
          yersen öğrenci işidir; Trakya Üniversitesi ile resmi bir bağı yoktur. <a href="#hakkinda">Kurallar ve KVKK</a>
        </p>
      </div>
    </main>
  );
}
