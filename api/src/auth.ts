import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "./db/client.ts";
import * as schema from "./db/schema.ts";

export type AuthEnv = {
  baseURL: string; // https://yersen.aegis.net.tr (geliştirmede http://localhost:5173)
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
};

/**
 * Google ile giriş (Better Auth). Oturum çerezi HttpOnly + SameSite=Lax; https'te Secure.
 * Giriş yapmak profil açmaz: profil, ilk girişte davet koduyla (claimInvite) oluşur.
 */
export function createAuth(db: Db, env: AuthEnv) {
  return betterAuth({
    baseURL: env.baseURL,
    basePath: "/api/auth",
    secret: env.secret,
    trustedOrigins: [env.baseURL],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
        prompt: "select_account",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 gün: öğrenci her gün yeniden giriş yapmasın
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      useSecureCookies: env.baseURL.startsWith("https://"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
