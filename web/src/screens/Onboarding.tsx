import { useState, type FormEvent } from "react";
import { prettyCode } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import { clearInvite, pendingInvite } from "../invite.ts";
import "./Screens.css";

export function Onboarding({ name, onDone }: { name: string; onDone: () => void }) {
  const [fromLink] = useState(pendingInvite);
  const [code, setCode] = useState(fromLink ? prettyCode(fromLink) : "");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.onboarding(code, nickname);
      clearInvite();
      onDone();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const firstName = name.split(" ")[0] ?? name;

  return (
    <main className="bugun">
      <form className="fis form-fis" onSubmit={(e) => void submit(e)} aria-labelledby="davet-baslik">
        <h1 id="davet-baslik">Hoş geldin {firstName}</h1>
        <p className="form-aciklama">
          {fromLink
            ? "Davet kodun linkten geldi. Burada görüneceğin takma adı seç yeter. Gerçek adın ve e-postan kimseye gösterilmez."
            : "Davet kodunu ve burada görüneceğin takma adı yaz. Gerçek adın ve e-postan kimseye gösterilmez."}
        </p>

        <label className="alan">
          <span>Davet kodu</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="ABCD-EFGH"
            required
            maxLength={16}
            className="kod-girdi"
          />
        </label>

        <label className="alan">
          <span>Takma ad</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="nickname"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus={fromLink !== null}
            minLength={3}
            maxLength={20}
          />
          <small>3-20 karakter: harf, rakam, alt çizgi ya da nokta.</small>
        </label>

        {error && (
          <p className="hata" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="dugme" disabled={busy}>
          {busy ? "Kontrol ediliyor…" : "Fişimi kes"}
        </button>
      </form>
    </main>
  );
}
