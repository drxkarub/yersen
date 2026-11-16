import type { ReactNode } from "react";
import { Layers, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import "./Shell.css";

export type Tab = "bugun" | "kaydir" | "ben" | "yonetim";

const tabs: { id: Tab; label: string; Icon: typeof ReceiptText }[] = [
  { id: "bugun", label: "Bugün", Icon: ReceiptText },
  { id: "kaydir", label: "Kaydır", Icon: Layers },
  { id: "ben", label: "Ben", Icon: UserRound },
  { id: "yonetim", label: "Yönetim", Icon: ShieldCheck },
];

/** staff: yönetici/moderatör; "Yönetim" sekmesi yalnızca onlara görünür (asıl koruma sunucuda). */
export function Shell({ date, active, staff = false, children }: { date: Date; active?: Tab; staff?: boolean; children?: ReactNode }) {
  const dateLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(date);

  return (
    <div className="shell">
      <header className="bant">
        <span className="kelime-isareti">yersen</span>
        <time className="bant-tarih" dateTime={date.toISOString().slice(0, 10)}>
          {dateLabel}
        </time>
      </header>
      <div className="shell-icerik">{children}</div>
      {active && <nav className="sekmeler" aria-label="Ana gezinme">
        {tabs.filter((t) => staff || t.id !== "yonetim").map(({ id, label, Icon }) => (
          <a key={id} href={`#${id}`} className="sekme" aria-current={id === active ? "page" : undefined}>
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </nav>}
    </div>
  );
}
