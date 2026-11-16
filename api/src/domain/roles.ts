import { eq, sql } from "drizzle-orm";
import type { DbOrTx } from "../db/client.ts";
import { profile } from "../db/schema.ts";

export type Role = "user" | "moderator" | "admin";

/** Takma adla (büyük/küçük harf duyarsız) rol atar. */
export async function setRole(
  db: DbOrTx,
  nickname: string,
  role: Role,
): Promise<{ ok: true; userId: string; previous: Role } | { ok: false; error: "not_found" }> {
  const [p] = await db
    .select({ id: profile.id, role: profile.role })
    .from(profile)
    .where(eq(sql`lower(${profile.nickname})`, nickname.trim().toLowerCase()));
  if (!p) return { ok: false, error: "not_found" };
  await db.update(profile).set({ role }).where(eq(profile.id, p.id));
  return { ok: true, userId: p.id, previous: p.role };
}
