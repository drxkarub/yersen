import { useCallback, useEffect, useState } from "react";
import type { MeResponse } from "@yersen/shared";
import { api, ApiError } from "./api.ts";
import { Shell, type Tab } from "./Shell.tsx";
import { Login } from "./screens/Login.tsx";
import { Onboarding } from "./screens/Onboarding.tsx";
import { TodayScreen } from "./screens/TodayScreen.tsx";
import { SwipeScreen } from "./screens/SwipeScreen.tsx";
import { MeScreen } from "./screens/MeScreen.tsx";
import { AdminScreen } from "./screens/AdminScreen.tsx";
import { LegalScreen } from "./screens/LegalScreen.tsx";

type Gate = { kind: "loading" } | { kind: "signed_out" } | { kind: "needs_invite"; me: MeResponse } | { kind: "ready"; me: MeResponse } | { kind: "error" };

const TABS: Tab[] = ["bugun", "kaydir", "ben", "yonetim"];
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace("#", "") as Tab;
  return TABS.includes(h) ? h : "bugun";
};

export function App() {
  const [gate, setGate] = useState<Gate>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [, setHash] = useState(window.location.hash); // #hakkinda gibi sekme olmayan adresler de yeniden çizdirsin

  const load = useCallback(async () => {
    try {
      const me = await api.me();
      setGate(me.profile ? { kind: "ready", me } : { kind: "needs_invite", me });
    } catch (err) {
      setGate(err instanceof ApiError && err.status === 401 ? { kind: "signed_out" } : { kind: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
    const onHash = () => {
      setTab(tabFromHash());
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [load]);

  const now = new Date();
  if (window.location.hash === "#hakkinda")
    return (
      <Shell date={now}>
        <LegalScreen />
      </Shell>
    );
  if (gate.kind === "loading") return <Shell date={now} />;
  if (gate.kind === "error")
    return (
      <Shell date={now}>
        <main className="bugun">
          <section className="fis fis-durum">
            <h1>Sunucuya ulaşılamadı</h1>
            <p>Yemekhane kapalı olabilir, biz değil. Birazdan sayfayı yenile.</p>
          </section>
        </main>
      </Shell>
    );
  if (gate.kind === "signed_out")
    return (
      <Shell date={now}>
        <Login />
      </Shell>
    );
  if (gate.kind === "needs_invite")
    return (
      <Shell date={now}>
        <Onboarding name={gate.me.user.name} onDone={load} />
      </Shell>
    );

  const staff = gate.me.profile?.role === "admin" || gate.me.profile?.role === "moderator";
  return (
    <Shell date={now} active={tab} staff={staff}>
      {tab === "bugun" && <TodayScreen staff={staff} />}
      {tab === "kaydir" && <SwipeScreen />}
      {tab === "ben" && <MeScreen me={gate.me} />}
      {tab === "yonetim" && (staff ? <AdminScreen /> : <TodayScreen staff={false} />)}
    </Shell>
  );
}
