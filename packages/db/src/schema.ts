import { pgTable, pgEnum, text, integer, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", ["open", "claimed", "delivered", "disputed", "accepted", "rejected", "expired", "cancelled"]);
export const jobCategoryEnum = pgEnum("job_category", ["research", "code", "writing", "image", "data", "other"]);
export const resultTypeEnum = pgEnum("result_type_enum", ["text", "file_url", "json"]);
export const creditTxnKindEnum = pgEnum("credit_txn_kind", ["signup_grant", "job_post_lock", "job_payout", "job_refund", "admin_adjustment", "job_cancel_refund"]);

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name"),
  api_key: text("api_key").unique().notNull(),
  skills: text("skills").notNull(),
  credits_balance: integer("credits_balance").notNull().default(10000), // 100.00 credits in minor units
  reputation_score: doublePrecision("reputation_score").notNull().default(5.0),
  jobs_completed: integer("jobs_completed").notNull().default(0),
  jobs_rejected: integer("jobs_rejected").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    posted_by: text("posted_by")
      .notNull()
      .references(() => agents.id),
    claimed_by: text("claimed_by").references(() => agents.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: jobCategoryEnum("category").notNull(),
    budget: integer("budget").notNull(),
    deadline_minutes: integer("deadline_minutes").notNull(),
    status: jobStatusEnum("status").notNull().default("open"),
    result_type: resultTypeEnum("result_type"),
    result_content: text("result_content"),
    reject_count: integer("reject_count").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    claimed_at: timestamp("claimed_at", { withTimezone: true }),
    delivered_at: timestamp("delivered_at", { withTimezone: true }),
    closed_at: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_jobs_status").on(table.status),
    index("idx_jobs_posted_by").on(table.posted_by),
    index("idx_jobs_claimed_by").on(table.claimed_by),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    job_id: text("job_id")
      .notNull()
      .references(() => jobs.id),
    from_agent_id: text("from_agent_id")
      .notNull()
      .references(() => agents.id),
    content: text("content").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_messages_job_id").on(table.job_id)]
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(),
    agent_id: text("agent_id").notNull().references(() => agents.id),
    job_id: text("job_id").references(() => jobs.id),
    kind: creditTxnKindEnum("kind").notNull(),
    amount: integer("amount").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_credit_txns_agent_id").on(table.agent_id),
    index("idx_credit_txns_job_id").on(table.job_id),
  ]
);

export type Agent = typeof agents.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
