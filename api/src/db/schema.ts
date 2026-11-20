import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// CLAUDE.md "Veri modeli taslağı". Gelecek için açık alanlar: meal_slot, menu.status/source,
// dish.owner_venue_id (mekan ürünleri), profile.residence_venue_id ve rating.residence_tag (yurtlar).

export const venueKind = pgEnum("venue_kind", ["cafeteria", "dorm", "place"]);
export const mealSlot = pgEnum("meal_slot", ["daily", "breakfast", "dinner"]);
export const menuStatus = pgEnum("menu_status", ["published", "pending"]);
export const menuSource = pgEnum("menu_source", ["scraper", "user_upload", "admin"]);
export const role = pgEnum("role", ["user", "moderator", "admin"]);
export const swipeChoice = pgEnum("swipe_choice", ["yes", "no", "maybe"]);
export const rateKind = pgEnum("rate_kind", ["swipe", "rating"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// --- Better Auth tabloları (kurulu better-auth 1.7 getAuthTables tanımlarıyla birebir) ---
const authTimestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...authTimestamps,
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...authTimestamps,
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  ...authTimestamps,
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...authTimestamps,
});

export const venue = pgTable("venue", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: venueKind("kind").notNull(),
  city: text("city").notNull(),
  university: text("university"),
});

export const dish = pgTable(
  "dish",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(), // dishKey(): eşleşme anahtarı
    displayName: text("display_name").notNull(), // menüde ilk görüldüğü ham ad
    ownerVenueId: integer("owner_venue_id").references(() => venue.id),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"), // "Yazar, CC BY-SA 4.0"
    imageSourceUrl: text("image_source_url"), // görselin kaynak sayfası (atıf bağlantısı)
    imageCheckedAt: timestamp("image_checked_at", { withTimezone: true }), // son arama; bulunamazsa haftada bir yeniden denenir
    imageLocked: boolean("image_locked").notNull().default(false), // görseli yönetici/moderatör belirledi; Commons dokunmaz
    createdAt: createdAt(),
  },
  (t) => [unique("dish_owner_key_unique").on(t.ownerVenueId, t.key).nullsNotDistinct()],
);

export const menu = pgTable(
  "menu",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => venue.id),
    date: date("date", { mode: "string" }).notNull(),
    mealSlot: mealSlot("meal_slot").notNull().default("daily"),
    kcal: integer("kcal"),
    status: menuStatus("status").notNull().default("published"),
    source: menuSource("source").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("menu_venue_date_slot_unique").on(t.venueId, t.date, t.mealSlot)],
);

export const menuItem = pgTable(
  "menu_item",
  {
    id: serial("id").primaryKey(),
    menuId: integer("menu_id")
      .notNull()
      .references(() => menu.id, { onDelete: "cascade" }),
    dishId: integer("dish_id")
      .notNull()
      .references(() => dish.id),
    position: integer("position").notNull(),
    rawName: text("raw_name").notNull(),
  },
  (t) => [
    unique("menu_item_menu_position_unique").on(t.menuId, t.position),
    unique("menu_item_menu_dish_unique").on(t.menuId, t.dishId),
  ],
);

export const profile = pgTable(
  "profile",
  {
    id: text("id").primaryKey(), // giriş sisteminin kullanıcı kimliği
    nickname: text("nickname").notNull(),
    role: role("role").notNull().default("user"),
    invitedBy: text("invited_by").references((): AnyPgColumn => profile.id),
    inviteQuota: integer("invite_quota").notNull().default(5),
    residenceVenueId: integer("residence_venue_id").references(() => venue.id),
    schoolEmailVerifiedAt: timestamp("school_email_verified_at", { withTimezone: true }),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("profile_nickname_lower_unique").on(sql`lower(${t.nickname})`)],
);

export const inviteCode = pgTable("invite_code", {
  code: text("code").primaryKey(),
  createdBy: text("created_by").references(() => profile.id), // null: admin üretimi
  usedBy: text("used_by")
    .unique()
    .references(() => profile.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const swipe = pgTable(
  "swipe",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profile.id),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItem.id),
    choice: swipeChoice("choice").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.menuItemId] })],
);

export const rating = pgTable(
  "rating",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profile.id),
    dishId: integer("dish_id")
      .notNull()
      .references(() => dish.id),
    menuItemId: integer("menu_item_id").references(() => menuItem.id, { onDelete: "set null" }),
    date: date("date", { mode: "string" }).notNull(),
    score: smallint("score").notNull(),
    residenceTag: integer("residence_tag").references(() => venue.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("rating_user_dish_date_unique").on(t.userId, t.dishId, t.date),
    check("rating_score_range", sql`${t.score} between 1 and 10`),
  ],
);

export const rateEvent = pgTable(
  "rate_event",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: rateKind("kind").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_event_user_kind_at").on(t.userId, t.kind, t.at)],
);

// --- Yönetim ---

/** Her yönetim işlemi: kim, ne zaman, ne yaptı, hangi kayıt üzerinde. */
export const adminAction = pgTable(
  "admin_action",
  {
    id: serial("id").primaryKey(),
    actorId: text("actor_id").notNull(), // profile.id ya da "cli"
    action: text("action").notNull(), // "set_role", "create_invites", "set_dish_image", "remove_dish_image"
    targetType: text("target_type").notNull(), // "profile", "dish", "invite"
    targetId: text("target_id"),
    detail: jsonb("detail"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_action_at").on(t.at)],
);

/** Scraper çalışmaları (panelde "son çalışma" durumu). */
export const scrapeRun = pgTable("scrape_run", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  ok: boolean("ok").notNull(),
  message: text("message").notNull(),
});

/** Günün tepsisinin gerçek fotoğrafı. Yalnızca moderatör/admin yükler; yoksa ön yüzde hiç görünmez. */
export const trayPhoto = pgTable(
  "tray_photo",
  {
    id: serial("id").primaryKey(),
    menuId: integer("menu_id")
      .notNull()
      .references(() => menu.id, { onDelete: "cascade" }),
    file: text("file").notNull(), // IMAGE_DIR içindeki dosya adı; /img/<file> olarak sunulur
    uploadedBy: text("uploaded_by").references(() => profile.id, { onDelete: "set null" }), // hesap silinirse fotoğraf kalır
    createdAt: createdAt(),
  },
  (t) => [index("tray_photo_menu").on(t.menuId)],
);
