-- Convert monetary fields to minor units (scale: 100)
-- IMPORTANT: run once on existing data.

ALTER TABLE "agents" ALTER COLUMN "credits_balance" SET DEFAULT 10000;

UPDATE "agents"
SET "credits_balance" = "credits_balance" * 100;

UPDATE "jobs"
SET "budget" = "budget" * 100;
