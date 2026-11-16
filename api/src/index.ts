import { serve } from "@hono/node-server";
import { createApp, type AuthPort } from "./app.ts";
import { createAuth } from "./auth.ts";
import { createDb } from "./db/client.ts";

const port = Number(process.env.API_PORT ?? 3300);
// Üretimde konteyner içinde 0.0.0.0, dışarıya ise compose ile sadece 127.0.0.1:3300 yayınlanır.
const hostname = process.env.API_HOST ?? "127.0.0.1";

const db = await createDb(process.env.DATABASE_URL || undefined);

function authFromEnv(): AuthPort | undefined {
  // Yalnızca geliştirme: Google'sız ekran denemesi için sabit bir kullanıcı. Üretimde asla.
  const devUser = process.env.DEV_FAKE_USER;
  if (devUser && process.env.NODE_ENV !== "production") {
    console.warn(`auth: GELİŞTİRME kısayolu açık, herkes "${devUser}" sayılıyor.`);
    return {
      handler: async () => new Response(JSON.stringify({ error: "dev" }), { status: 400 }),
      session: async () => ({ userId: devUser, name: "Geliştirici Deneme", email: "dev@localhost", image: null }),
    };
  }
  const { BETTER_AUTH_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!BETTER_AUTH_URL || !BETTER_AUTH_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn("auth: BETTER_AUTH_* veya GOOGLE_CLIENT_* eksik; giriş kapalı.");
    return undefined;
  }
  const auth = createAuth(db, {
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    googleClientId: GOOGLE_CLIENT_ID,
    googleClientSecret: GOOGLE_CLIENT_SECRET,
  });
  return {
    handler: (req) => auth.handler(req),
    session: async (headers) => {
      const s = await auth.api.getSession({ headers });
      return s ? { userId: s.user.id, name: s.user.name, email: s.user.email, image: s.user.image ?? null } : null;
    },
  };
}

// Üretim imajında STATIC_DIR=/app/web/dist; geliştirmede ön yüzü Vite servis eder.
const app = createApp({
  db,
  auth: authFromEnv(),
  staticDir: process.env.STATIC_DIR || undefined,
  imageDir: process.env.IMAGE_DIR || undefined,
  publicOrigin: process.env.BETTER_AUTH_URL || undefined,
});

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`api: http://${info.address}:${info.port}`);
});
