// Yönetici davet kodları üretir (davet ağacının kökü).
//   Sunucuda: docker compose -f /opt/yersen/docker-compose.yml exec api node --import tsx src/cli/invite-codes.ts 3
//   Yerelde:  npx tsx api/src/cli/invite-codes.ts 3
import { createDb } from "../db/client.ts";
import { adminCreateCodes } from "../domain/invites.ts";

const n = Number(process.argv[2] ?? 1);
if (!Number.isInteger(n) || n < 1 || n > 100) {
  console.error("Kullanım: invite-codes.ts <1-100>");
  process.exit(2);
}
const db = await createDb(process.env.DATABASE_URL || undefined);
for (const code of await adminCreateCodes(db, n)) console.log(`${code.slice(0, 4)}-${code.slice(4)}`);
process.exit(0);
