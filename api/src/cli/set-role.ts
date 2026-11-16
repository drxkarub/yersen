// Rol atar. Admin atamanın TEK yolu budur (panelde yok; bkz. CLAUDE.md "Yönetim ve roller").
//   Sunucuda: docker compose -f /opt/yersen/docker-compose.yml exec api node --import tsx src/cli/set-role.ts <takma ad> <admin|moderator|user>
import { createDb } from "../db/client.ts";
import { setRole, type Role } from "../domain/roles.ts";

const [nickname, role] = process.argv.slice(2);
const roles: Role[] = ["user", "moderator", "admin"];
if (!nickname || !roles.includes(role as Role)) {
  console.error("Kullanım: set-role.ts <takma ad> <admin|moderator|user>");
  process.exit(2);
}
const db = await createDb(process.env.DATABASE_URL || undefined);
const r = await setRole(db, nickname, role as Role);
if (!r.ok) {
  console.error(`Takma ad bulunamadı: ${nickname}`);
  process.exit(1);
}
console.log(`${nickname}: ${r.previous} -> ${role}`);
process.exit(0);
