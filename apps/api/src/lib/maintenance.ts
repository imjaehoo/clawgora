import { v4 as uuidv4 } from "uuid";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, jobs, creditTransactions } from "../db/schema.js";
import { computePayoutMinor } from "./money.js";

export async function runAutoMaintenance() {
  // Auto-accept: delivered jobs older than 24h
  const deliveredJobs = await db
    .select()
    .from(jobs)
    .where(
      sql`${jobs.status} = 'delivered' AND ${jobs.delivered_at} <= now() - interval '24 hours'`
    );

  for (const job of deliveredJobs) {
    const payout = computePayoutMinor(job.budget);

    await db.transaction(async (tx) => {
      const acceptedRows = await tx.update(jobs)
        .set({ status: "accepted", closed_at: sql`now()` })
        .where(and(eq(jobs.id, job.id), eq(jobs.status, "delivered")))
        .returning({ id: jobs.id });

      if (!acceptedRows.length) return;

      const [worker] = await tx.select({ rep: agents.reputation_score })
        .from(agents).where(eq(agents.id, job.claimed_by!));
      const newWorkerRep = Math.min(5.0, +(worker.rep * 0.9 + 5.0 * 0.1).toFixed(2));

      await tx.update(agents)
        .set({
          credits_balance: sql`${agents.credits_balance} + ${payout}`,
          jobs_completed: sql`${agents.jobs_completed} + 1`,
          reputation_score: newWorkerRep,
        })
        .where(eq(agents.id, job.claimed_by!));

      await tx.insert(creditTransactions).values({
        id: uuidv4(),
        agent_id: job.claimed_by!,
        job_id: job.id,
        kind: "job_payout",
        amount: payout,
      });

      await tx.update(agents)
        .set({ jobs_completed: sql`${agents.jobs_completed} + 1` })
        .where(eq(agents.id, job.posted_by));
    });
  }

  // Auto-expire: open jobs past their deadline
  const expiredJobs = await db
    .select()
    .from(jobs)
    .where(
      sql`${jobs.status} = 'open' AND ${jobs.created_at} + (${jobs.deadline_minutes} * interval '1 minute') <= now()`
    );

  for (const job of expiredJobs) {
    await db.transaction(async (tx) => {
      const expiredRows = await tx.update(jobs)
        .set({ status: "expired", closed_at: sql`now()` })
        .where(and(eq(jobs.id, job.id), eq(jobs.status, "open")))
        .returning({ id: jobs.id });

      if (!expiredRows.length) return;

      await tx.update(agents)
        .set({
          credits_balance: sql`${agents.credits_balance} + ${job.budget}`,
        })
        .where(eq(agents.id, job.posted_by));

      await tx.insert(creditTransactions).values({
        id: uuidv4(),
        agent_id: job.posted_by,
        job_id: job.id,
        kind: "job_refund",
        amount: job.budget,
      });
    });
  }
}
