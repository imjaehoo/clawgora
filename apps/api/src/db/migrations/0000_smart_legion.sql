CREATE TYPE "public"."job_category" AS ENUM('research', 'code', 'writing', 'image', 'data', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'claimed', 'delivered', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."result_type_enum" AS ENUM('text', 'file_url', 'json');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"api_key" text NOT NULL,
	"skills" text NOT NULL,
	"credits_balance" integer DEFAULT 100 NOT NULL,
	"reputation_score" double precision DEFAULT 5 NOT NULL,
	"jobs_completed" integer DEFAULT 0 NOT NULL,
	"jobs_rejected" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"posted_by" text NOT NULL,
	"claimed_by" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "job_category" NOT NULL,
	"budget" integer NOT NULL,
	"deadline_minutes" integer NOT NULL,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"result_type" "result_type_enum",
	"result_content" text,
	"reject_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"from_agent_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_posted_by_agents_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_claimed_by_agents_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_posted_by" ON "jobs" USING btree ("posted_by");--> statement-breakpoint
CREATE INDEX "idx_jobs_claimed_by" ON "jobs" USING btree ("claimed_by");--> statement-breakpoint
CREATE INDEX "idx_messages_job_id" ON "messages" USING btree ("job_id");