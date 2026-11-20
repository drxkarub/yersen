CREATE TABLE "tray_photo" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_id" integer NOT NULL,
	"file" text NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tray_photo" ADD CONSTRAINT "tray_photo_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tray_photo" ADD CONSTRAINT "tray_photo_uploaded_by_profile_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tray_photo_menu" ON "tray_photo" USING btree ("menu_id");