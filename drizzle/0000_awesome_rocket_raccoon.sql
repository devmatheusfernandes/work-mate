CREATE TABLE "folders" (
	"user_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"parent_id" text,
	"color" text,
	"archived" boolean DEFAULT false NOT NULL,
	"trashed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"user_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Nova Nota' NOT NULL,
	"content" text,
	"search_text" text,
	"tag_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"folder_id" text,
	"archived" boolean DEFAULT false NOT NULL,
	"trashed" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"type" text DEFAULT 'note' NOT NULL,
	"file_url" text,
	"file_size" integer,
	"is_locked" boolean DEFAULT false NOT NULL,
	"task_status" text,
	"task_deadline" text,
	"task_subtasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"task_should_notify" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"user_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" text NOT NULL,
	"source_type" text NOT NULL,
	"content_to_embed" text NOT NULL,
	"embedding" vector(768),
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendars" (
	"user_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"background_color" text DEFAULT 'bg-blue-500' NOT NULL,
	"foreground_color" text DEFAULT 'text-white' NOT NULL,
	"shared_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"user_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"calendar_id" text NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"location" text,
	"start_date_time" timestamp NOT NULL,
	"start_time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"end_date_time" timestamp NOT NULL,
	"end_time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON UPDATE no action;