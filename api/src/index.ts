import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createDb } from "./db/client.ts";

const port = Number(process.env.API_PORT ?? 3300);
// Üretimde konteyner içinde 0.0.0.0, dışarıya ise compose ile sadece 127.0.0.1:3300 yayınlanır.
const hostname = process.env.API_HOST ?? "127.0.0.1";

const db = await createDb(process.env.DATABASE_URL || undefined);
const app = createApp({ db });

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`api: http://${info.address}:${info.port}`);
});
