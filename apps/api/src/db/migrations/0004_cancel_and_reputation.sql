ALTER TYPE "public"."job_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."credit_txn_kind" ADD VALUE 'job_cancel_refund';
