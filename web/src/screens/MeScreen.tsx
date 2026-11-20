import { useEffect, useState } from "react";
import type { InvitesResponse, MeResponse } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import "./Screens.css";

const SHOW_USED = 5; // fazlası "ve N kişi daha"

const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function MeScreen({ me }: { me: MeResponse }) {
  const [invites, setInvites] = useState<InvitesResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [allUsed, setAllUsed] = useState(false);
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
  // Kullanılmış kodlar liste kalabalığı yapmasın: yalnızca kimi davet ettiğin.
  const used = invites?.codes.flatMap((c) => (c.usedBy ? [c.usedBy] : [])) ?? [];
  const isAdmin = me.profile?.role === "admin";
  const more = async () => {
    setBusy(true);
    setNote(null);
    try {
      setInvites(await api.moreInvites());
    } catch (err) {
      setNote(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bugun">
      <section className="fis" aria-labelledby="ben-baslik">
        <div className="fis-bas fis-bas-kisa">
          <h1 id="ben-baslik">{me.profile?.nickname}</h1>
          {me.profile && me.profile.role !== "user" && <span className="fis-no">{me.profile.role === "admin" ? "yönetici" : "moderatör"}</span>}
        </div>
        <h2 className="alt-baslik">Davet kodların</h2>
        <p className="form-aciklama">
          {!invites
            ? "Yükleniyor…"
            : free.length > 0
              ? `${free.length} kodun boşta. Her kod bir kişiyi içeri alır.`
              : "Kodların bitti."}
        </p>
        {free.length > 0 && (
          <ul className="kodlar">
            {free.map((c) => (
              <li key={c.code}>
                <span className="kod">{pretty(c.code)}</span>
                <button type="button" className="kod-paylas" onClick={() => void share(c.code)}>
                  Paylaş
                </button>
              </li>
            ))}
          </ul>
        )}
        {used.length > 0 && (
          <p className="davet-edilenler">
            <span>Davet ettiklerin ({used.length}):</span>{" "}
            {allUsed || used.length <= SHOW_USED ? (
              used.join(", ")
            ) : (
              <>
                {used.slice(-SHOW_USED).reverse().join(", ")} ve {used.length - SHOW_USED} kişi daha.{" "}
                <button type="button" className="metin-dugme" onClick={() => setAllUsed(true)}>
                  Hepsini gör
                </button>
              </>
            )}
          </p>
        )}
        {invites && free.length === 0 && isAdmin && (
          <button type="button" className="dugme dugme-ikincil kod-al" disabled={busy} onClick={() => void more()}>
            {busy ? "Üretiliyor…" : "5 yeni kod al"}
          </button>
        )}
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
  const [allUsed, setAllUsed] = useState(false);
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
