import { Apple, CakeSlice, CupSoda, Milk, Salad, Soup, UtensilsCrossed, type LucideIcon } from "lucide-react";

/** Görsel yoksa yemek adındaki anahtar kelimeye göre ikon (CLAUDE.md "Görseller"). */
function iconFor(name: string): LucideIcon {
  const n = name.toLocaleLowerCase("tr-TR");
  if (n.includes("çorba")) return Soup;
  if (/(ayran|meyve suyu|limonata|komposto|şıra|su\b)/.test(n)) return CupSoda;
  if (/(yoğurt|cacık)/.test(n)) return Milk;
  if (/(salata|söğüş)/.test(n)) return Salad;
  if (/(tatlı|baklava|revani|tulumba|sütlaç|kazandibi|puding|helva|kek|kadayıf|irmik)/.test(n)) return CakeSlice;
  if (/(meyve|elma|portakal|mandalina|muz)/.test(n)) return Apple;
  return UtensilsCrossed;
}

export function DishVisual({ name, imageUrl, imageCredit }: { name: string; imageUrl: string | null; imageCredit: string | null }) {
  if (imageUrl) {
    return (
      <figure className="gorsel">
        <img src={imageUrl} alt="" loading="lazy" decoding="async" draggable={false} />
        <figcaption>
          <span>Temsili görsel</span>
          {imageCredit && <span>{imageCredit}</span>}
        </figcaption>
      </figure>
    );
  }
  const Icon = iconFor(name);
  return (
    <div className="gorsel gorsel-ikon" aria-hidden="true">
      <Icon size={72} strokeWidth={1.5} />
    </div>
  );
}
