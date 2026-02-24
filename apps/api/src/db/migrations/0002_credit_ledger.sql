CREATE TYPE "public"."credit_txn_kind" AS ENUM('signup_grant', 'job_post_lock', 'job_payout', 'job_refund');--> statement-breakpoint

CREATE TABLE "credit_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_id" text NOT NULL,
  "job_id" text,
  "kind" "credit_txn_kind" NOT NULL,
  "amount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "credit_transactions"
  ADD CONSTRAINT "credit_transactions_agent_id_agents_id_fk"
  FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "credit_transactions"
  ADD CONSTRAINT "credit_transactions_job_id_jobs_id_fk"
  FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_credit_txns_agent_id" ON "credit_transactions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_credit_txns_job_id" ON "credit_transactions" USING btree ("job_id");
