/** Puanlama kategorileri. Okulun menüsü hep bu sırayla yazılır; ad önce, sıra sonra belirler. */
export type DishCategory = "corba" | "ana" | "pilav" | "yan";

export const CATEGORY_LABEL: Record<DishCategory, string> = {
  corba: "Çorba",
  ana: "Ana yemek",
  pilav: "Pilav/makarna",
  yan: "Tatlı/salata/içecek",
};

// Sıra önemli: "YOĞURT ÇORBA" çorbadır, "ŞEHRİYELİ GÜVEÇ" ana yemektir.
const RULES: [DishCategory, RegExp][] = [
  ["corba", /çorba/],
  ["ana", /patates|püre|kızartma/], // ana yemeğin yanında gelir
  ["pilav", /pilav|makarna|erişte|spagetti|mantı|kuskus|bulgur|börek|(^|\s)şehriye(\s|$)|lazanya|penne/],
  ["yan", /tatlı|baklava|revani|tulumba|sütlaç|kazandibi|puding|helva|kek\b|kadayıf|irmik|komposto|ayran|yoğurt|cacık|salata|söğüş|meyve|turşu|(^|\s)su(\s|$)|limonata|şıra/],
];

export function dishCategory(rawName: string, position: number): DishCategory {
  const name = rawName.trim().toLocaleLowerCase("tr-TR");
  for (const [category, re] of RULES) if (re.test(name)) return category;
  return position <= 0 ? "corba" : position === 1 ? "ana" : position === 2 ? "pilav" : "yan";
}
