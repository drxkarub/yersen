CREATE TABLE "admin_action" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"detail" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"message" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dish" ADD COLUMN "image_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "admin_action_at" ON "admin_action" USING btree ("at");