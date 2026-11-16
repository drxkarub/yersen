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
      <div className="eylem">
        <button type="button" className="dugme dugme-ikincil" onClick={() => void signOut()}>
          Çıkış yap
        </button>
        <p className="dipnot">yersen öğrenci işidir; Trakya Üniversitesi ile resmi bir bağı yoktur.</p>
      </div>
    </main>
  );
}
