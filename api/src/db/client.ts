import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema.ts";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
/** db.transaction içindeki işlem nesnesi. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/**
 * DATABASE_URL varsa gerçek Postgres'e (üretim), yoksa diskteki PGlite'a
 * (yerel geliştirme) bağlanır. Her iki durumda da migration'lar uygulanır.
 */
export async function createDb(databaseUrl: string | undefined): Promise<Db> {
  if (databaseUrl) {
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
    const db = drizzlePg({ client: pool, schema });
    await migratePg(db, { migrationsFolder });
    return db as unknown as Db;
  }
  const dataDir = fileURLToPath(new URL("../../.pglite", import.meta.url));
  const db = drizzlePglite({ client: new PGlite(dataDir), schema });
  await migratePglite(db, { migrationsFolder });
  return db as unknown as Db;
}

/** Testler için bellekte, migration'ları uygulanmış, her çağrıda temiz bir veritabanı. */
export async function createTestDb(): Promise<Db> {
  const db = drizzlePglite({ client: new PGlite(), schema });
  await migratePglite(db, { migrationsFolder });
  return db as unknown as Db;
}
