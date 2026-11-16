import { useState } from "react";
import { api, errorText } from "../api.ts";
import "./Screens.css";

export function Login() {
  const [busy, setBusy] = useState(false);
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
        <p>Yemekhanenin bugünkü menüsü, kaç puan aldığı ve senin hükmün. Davetle giriliyor: önce Google ile giriş yap, sonra davet kodunu yaz.</p>
      </section>
      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}
      <div className="eylem">
        <button type="button" className="dugme" onClick={() => void signIn()} disabled={busy}>
          {busy ? "Google'a gidiyor…" : "Google ile giriş yap"}
        </button>
        <p className="dipnot">yersen öğrenci işidir; Trakya Üniversitesi ile resmi bir bağı yoktur.</p>
      </div>
    </main>
  );
}
