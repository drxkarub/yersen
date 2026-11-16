// Test seti başlamadan bir kez: migration'ları uygulanmış PGlite veri dizinini dosyaya yazar.
// İşçiler bunu yükler (createTestDb), her biri ayrıca migrate etmez; paralel yükte zaman aşımı olmaz.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export default async function setup() {
  const pg = new PGlite();
  await migrate(drizzle({ client: pg }), { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) });
  const dump = await pg.dumpDataDir("none");
  const file = join(mkdtempSync(join(tmpdir(), "yersen-testdb-")), "template.tar");
  writeFileSync(file, Buffer.from(await dump.arrayBuffer()));
  await pg.close();
  process.env.YERSEN_TEST_TEMPLATE = file;
}
