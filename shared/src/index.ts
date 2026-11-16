export * from "./api.ts";
export { dishKey } from "./dishKey.ts";

export type HealthResponse = {
  ok: boolean;
  db: boolean;
};
