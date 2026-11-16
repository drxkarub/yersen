CREATE TYPE "public"."meal_slot" AS ENUM('daily', 'breakfast', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."menu_source" AS ENUM('scraper', 'user_upload', 'admin');--> statement-breakpoint
CREATE TYPE "public"."menu_status" AS ENUM('published', 'pending');--> statement-breakpoint
CREATE TYPE "public"."rate_kind" AS ENUM('swipe', 'rating');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."swipe_choice" AS ENUM('yes', 'no', 'maybe');--> statement-breakpoint
CREATE TYPE "public"."venue_kind" AS ENUM('cafeteria', 'dorm', 'place');--> statement-breakpoint
CREATE TABLE "dish" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"owner_venue_id" integer,
	"image_url" text,
	"image_credit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dish_owner_key_unique" UNIQUE NULLS NOT DISTINCT("owner_venue_id","key")
);
--> statement-breakpoint
CREATE TABLE "invite_code" (
	"code" text PRIMARY KEY NOT NULL,
	"created_by" text,
	"used_by" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_code_used_by_unique" UNIQUE("used_by")
);
--> statement-breakpoint
CREATE TABLE "menu" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"date" date NOT NULL,
	"meal_slot" "meal_slot" DEFAULT 'daily' NOT NULL,
	"kcal" integer,
	"status" "menu_status" DEFAULT 'published' NOT NULL,
	"source" "menu_source" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_venue_date_slot_unique" UNIQUE("venue_id","date","meal_slot")
);
--> statement-breakpoint
CREATE TABLE "menu_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_id" integer NOT NULL,
	"dish_id" integer NOT NULL,
	"position" integer NOT NULL,
	"raw_name" text NOT NULL,
	CONSTRAINT "menu_item_menu_position_unique" UNIQUE("menu_id","position"),
	CONSTRAINT "menu_item_menu_dish_unique" UNIQUE("menu_id","dish_id")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"invited_by" text,
	"invite_quota" integer DEFAULT 5 NOT NULL,
	"residence_venue_id" integer,
	"school_email_verified_at" timestamp with time zone,
	"banned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "rate_kind" NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"dish_id" integer NOT NULL,
	"menu_item_id" integer,
	"date" date NOT NULL,
	"score" smallint NOT NULL,
	"residence_tag" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_user_dish_date_unique" UNIQUE("user_id","dish_id","date"),
	CONSTRAINT "rating_score_range" CHECK ("rating"."score" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "swipe" (
	"user_id" text NOT NULL,
	"menu_item_id" integer NOT NULL,
	"choice" "swipe_choice" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "swipe_user_id_menu_item_id_pk" PRIMARY KEY("user_id","menu_item_id")
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "venue_kind" NOT NULL,
	"city" text NOT NULL,
	"university" text,
	CONSTRAINT "venue_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "dish" ADD CONSTRAINT "dish_owner_venue_id_venue_id_fk" FOREIGN KEY ("owner_venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_code" ADD CONSTRAINT "invite_code_created_by_profile_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_code" ADD CONSTRAINT "invite_code_used_by_profile_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu" ADD CONSTRAINT "menu_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_dish_id_dish_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dish"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_invited_by_profile_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_residence_venue_id_venue_id_fk" FOREIGN KEY ("residence_venue_id") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_user_id_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_dish_id_dish_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dish"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_menu_item_id_menu_item_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_residence_tag_venue_id_fk" FOREIGN KEY ("residence_tag") REFERENCES "public"."venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe" ADD CONSTRAINT "swipe_user_id_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe" ADD CONSTRAINT "swipe_menu_item_id_menu_item_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_nickname_lower_unique" ON "profile" USING btree (lower("nickname"));--> statement-breakpoint
CREATE INDEX "rate_event_user_kind_at" ON "rate_event" USING btree ("user_id","kind","at");