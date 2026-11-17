export * from "./api.ts";
export { dishKey } from "./dishKey.ts";
export { CATEGORY_LABEL, dishCategory, inDeck, type DishCategory } from "./dishCategory.ts";

export type HealthResponse = {
  ok: boolean;
  db: boolean;
};
