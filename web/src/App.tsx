import { Shell } from "./Shell.tsx";
import { Today, type TodayStatus } from "./screens/Today.tsx";
import { sampleLastMonthBest, sampleNotYetRated, sampleToday } from "./sample.ts";

// Gerçek veri Faz 1'de API'den gelecek. O zamana kadar ekran örnek veriyle çalışır;
// durumlar ?durum=acik|bekliyor|kapali|yayinlanmadi ile önizlenebilir.
const STATUSES: TodayStatus[] = ["acik", "bekliyor", "kapali", "yayinlanmadi"];

export function App() {
  const param = new URLSearchParams(location.search).get("durum");
  const status: TodayStatus = STATUSES.includes(param as TodayStatus) ? (param as TodayStatus) : "acik";

  // Kapalı durumu bir hafta sonunda (Pazar 15 Kasım) sahnelenir; sıradaki menü Pazartesininki.
  const date = status === "kapali" ? "2026-11-15" : sampleToday.date;
  const menu = status === "bekliyor" ? sampleNotYetRated : sampleToday;

  return (
    <Shell date={new Date(`${date}T12:00:00`)} active="bugun">
      <Today
        menu={menu}
        status={status}
        extra={
          status === "kapali"
            ? { title: "Pazartesinin menüsü", dishes: sampleNotYetRated.dishes, showScores: false }
            : { title: "Geçen ayın en iyileri", dishes: sampleLastMonthBest, showScores: true }
        }
        demo
      />
    </Shell>
  );
}
