import { useEffect, useState } from "react";
import type { DayNavResponse } from "@yersen/shared";
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

export function TodayScreen({ staff, admin = false }: { staff: boolean; admin?: boolean }) {
  const [data, setData] = useState<DayNavResponse | "error" | null>(null);
  const [date, setDate] = useState<string | undefined>(undefined); // undefined: bugün
  const [version, setVersion] = useState(0); // tepsi fotoğrafı eklenince/kaldırılınca yeniden yükle
  useEffect(() => {
    let current = true;
    // Önceki gün yeni gün gelene kadar ekranda kalır (boş ekran yanıp sönmesin).
    api.day(date).then(
      (r) => current && setData(r),
      () => current && setData("error"),
    );
    return () => {
      current = false;
    };
  }, [date, version]);

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
  // key: gün değişince fişin iç durumu (açık satır, basılan mühürler) sıfırlanır.
  return <Today key={data.date} nav={data} now={new Date()} actions={actions} onGo={setDate} staff={staff} admin={admin} onTrayChange={() => setVersion((v) => v + 1)} />;
}
