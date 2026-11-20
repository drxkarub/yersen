import { useState } from "react";
import { prettyCode } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import { inAppBrowser, pendingInvite } from "../invite.ts";
import "./Screens.css";

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
    <main className="bugun">
      <section className="fis fis-durum" aria-labelledby="giris-baslik">
        <span className="durum-muhru" aria-hidden="true">
          Davetli
        </span>
        <h1 id="giris-baslik">Yersen gel puanla, yemezsen keyfin bilir</h1>
        <p>
          {invite
            ? "Yemekhanenin bugünkü menüsü, kaç puan aldığı ve senin hükmün. Davetin hazır: Google ile giriş yap, sonra takma adını seç."
            : "Yemekhanenin bugünkü menüsü, kaç puan aldığı ve senin hükmün. Davetle giriliyor: önce Google ile giriş yap, sonra davet kodunu yaz."}
        </p>
        {invite && (
          <p className="davet-hazir">
            Davet kodun: <strong className="kod">{prettyCode(invite)}</strong>
          </p>
        )}
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
      <div className="eylem">
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
