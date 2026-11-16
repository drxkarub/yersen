import { useEffect, useState } from "react";
import type { InvitesResponse, MeResponse } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import "./Screens.css";

const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function MeScreen({ me }: { me: MeResponse }) {
  const [invites, setInvites] = useState<InvitesResponse | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api.invites().then(setInvites, (err) => setNote(errorText(err)));
  }, []);

  const share = async (code: string) => {
    const text = `yersen'e davet kodun: ${pretty(code)}\nhttps://yersen.aegis.net.tr`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setNote(`${pretty(code)} kopyalandı.`);
      }
    } catch {
      /* kullanıcı paylaşımı kapattı */
    }
  };

  const signOut = async () => {
    await api.signOut().catch(() => {});
    window.location.assign("/");
  };

  const free = invites?.codes.filter((c) => c.usedBy === null) ?? [];

  return (
    <main className="bugun">
      <section className="fis" aria-labelledby="ben-baslik">
        <div className="fis-bas fis-bas-kisa">
          <h1 id="ben-baslik">{me.profile?.nickname}</h1>
          {me.profile && me.profile.role !== "user" && <span className="fis-no">{me.profile.role === "admin" ? "yönetici" : "moderatör"}</span>}
        </div>
        <h2 className="alt-baslik">Davet kodların</h2>
        <p className="form-aciklama">
          {invites ? `${free.length} kodun boşta. Her kod bir kişiyi içeri alır.` : "Yükleniyor…"}
        </p>
        <ul className="kodlar">
          {invites?.codes.map((c) => (
            <li key={c.code} data-kullanildi={c.usedBy !== null || undefined}>
              <span className="kod">{pretty(c.code)}</span>
              {c.usedBy ? (
                <span className="kod-kim">{c.usedBy} kullandı</span>
              ) : (
                <button type="button" className="kod-paylas" onClick={() => void share(c.code)}>
                  Paylaş
                </button>
              )}
            </li>
          ))}
        </ul>
        {note && (
          <p className="form-aciklama" role="status">
            {note}
          </p>
        )}
      </section>
      <DeleteAccount me={me} />

      <div className="eylem">
        <button type="button" className="dugme dugme-ikincil" onClick={() => void signOut()}>
          Çıkış yap
        </button>
        <p className="dipnot">
          yersen öğrenci işidir; Trakya Üniversitesi ile resmi bir bağı yoktur. <a href="#hakkinda">Kurallar ve KVKK</a>
        </p>
      </div>
    </main>
  );
}

function DeleteAccount({ me }: { me: MeResponse }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nickname = me.profile?.nickname ?? "";

  if (me.profile?.role === "admin")
    return <p className="dipnot">Yönetici hesabı silinemez. Önce yöneticiliği devretmen gerekir.</p>;

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount(confirm);
      window.location.assign("/");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button type="button" className="yemedim sil-ac" onClick={() => setOpen(true)}>
        Hesabımı sil
      </button>
    );

  return (
    <section className="fis sil" aria-labelledby="sil-baslik">
      <h2 id="sil-baslik" className="alt-baslik">
        Hesabını sil
      </h2>
      <p className="form-aciklama">
        Google bilgilerin, takma adın, kararların ve puanların kalıcı olarak silinir; geri alınamaz. Davet ettiğin kişilerin hesabı kalır.
        Onaylamak için takma adını yaz: <strong>{nickname}</strong>
      </p>
      <label className="alan">
        <span className="sr-only">Takma adın</span>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
      </label>
      {error && <p className="hata">{error}</p>}
      <div className="sil-tuslar">
        <button type="button" className="dugme dugme-ikincil" onClick={() => setOpen(false)}>
          Vazgeç
        </button>
        <button
          type="button"
          className="dugme dugme-tehlike"
          disabled={busy || confirm.trim().toLowerCase() !== nickname.toLowerCase()}
          onClick={() => void remove()}
        >
          {busy ? "Siliniyor…" : "Kalıcı olarak sil"}
        </button>
      </div>
    </section>
  );
}
