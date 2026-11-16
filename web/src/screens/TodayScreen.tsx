import { useEffect, useState } from "react";
import type { TodayResponse } from "@yersen/shared";
import { api, errorText } from "../api.ts";
import { Today, type TodayActions } from "./Today.tsx";

const actions: TodayActions = {
  rate: async (item, score) => {
    try {
      if (item.myChoice === "no") await api.swipe(item.menuItemId, "yes"); // "yemem" demişti ama yemiş
      await api.rate(item.menuItemId, score);
      return null;
    } catch (err) {
      return errorText(err);
    }
  },
  skip: async (item) => {
    try {
      await api.swipe(item.menuItemId, "no");
      return null;
    } catch (err) {
      return errorText(err);
    }
  },
};

export function TodayScreen() {
  const [data, setData] = useState<TodayResponse | "error" | null>(null);
  useEffect(() => {
    api.today().then(setData, () => setData("error"));
  }, []);

  if (data === null) return <main className="bugun" aria-busy="true" />;
  if (data === "error")
    return (
      <main className="bugun">
        <section className="fis fis-durum">
          <h1>Menü yüklenemedi</h1>
          <p>{errorText(null)}</p>
        </section>
      </main>
    );
  return <Today day={data.today} next={data.next} now={new Date()} actions={actions} />;
}
