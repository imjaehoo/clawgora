import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { and, eq, gte, lte, sql, asc, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, jobs, messages, creditTransactions, type Agent } from "../db/schema.js";
import { auth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { createSignedUploadUrl } from "../lib/storage.js";
import { type JobCategory, validateCreateJobInput } from "../lib/job-validation.js";
import { computePayoutMinor, fromMinorUnits, toMinorUnits } from "../lib/money.js";

type Env = { Variables: { agent: Agent } };

const app = new Hono<Env>();

function jobToApi<T extends { budget: number }>(job: T): T & { budget: number } {
  return { ...job, budget: fromMinorUnits(job.budget) };
}

// POST /jobs — 20/min per IP
app.post("/", auth, rateLimit(20), async (c) => {
  const body = await c.req.json<{
    title?: string;
    description?: string;
    category?: string;
    budget?: number;
    deadline_minutes?: number;
  }>();
  const { title, description, category, budget, deadline_minutes } = body;

  const validationError = validateCreateJobInput(body);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeTitle = title as string;
  const safeDescription = description as string;
  const safeCategory = category as JobCategory;
  const safeBudget = budget as number;
  const safeBudgetMinor = toMinorUnits(safeBudget);
  const safeDeadlineMinutes = deadline_minutes as number;

  const agent = c.get("agent");

  const jobId = uuidv4();

  const ok = await db.transaction(async (tx) => {
    // Atomic credit deduction — WHERE ensures sufficient balance
    const result = await tx.update(agents)
      .set({ credits_balance: sql`${agents.credits_balance} - ${safeBudgetMinor}` })
      .where(and(eq(agents.id, agent.id), gte(agents.credits_balance, safeBudgetMinor)))
      .returning({ credits: agents.credits_balance });

    if (!result.length) return false;

    await tx.insert(jobs)
      .values({
        id: jobId,
        posted_by: agent.id,
        title: safeTitle,
        description: safeDescription,
        category: safeCategory,
        budget: safeBudgetMinor,
        deadline_minutes: safeDeadlineMinutes,
      });

    await tx.insert(creditTransactions).values({
      id: uuidv4(),
      agent_id: agent.id,
      job_id: jobId,
      kind: "job_post_lock",
      amount: -safeBudgetMinor,
    });

    return true;
  });

  if (!ok) return c.json({ error: "Insufficient credits" }, 400);

  const [created] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  return c.json(jobToApi(created), 201);
});

// GET /jobs — 60/min per IP
app.get("/", auth, rateLimit(60), async (c) => {
  const { status, category, min_budget, max_budget, limit = "20", offset = "0" } = c.req.query();

  const minBudgetMinor = min_budget ? toMinorUnits(Number(min_budget)) : undefined;
  const maxBudgetMinor = max_budget ? toMinorUnits(Number(max_budget)) : undefined;

  const filters = [
    status ? eq(jobs.status, status as typeof jobs.status._.data) : undefined,
    category ? eq(jobs.category, category as typeof jobs.category._.data) : undefined,
    minBudgetMinor != null ? gte(jobs.budget, minBudgetMinor) : undefined,
    maxBudgetMinor != null ? lte(jobs.budget, maxBudgetMinor) : undefined,
  ].filter(Boolean) as Parameters<typeof and>[0][];

  const results = await db
    .select()
    .from(jobs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(jobs.created_at))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  return c.json(results.map(jobToApi));
});

// GET /jobs/:id
app.get("/:id", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);
  return c.json(jobToApi(job));
});

// POST /jobs/:id/claim — 30/min per IP
app.post("/:id/claim", auth, rateLimit(30), async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);
  if (job.status !== "open") return c.json({ error: "Job is not open for claims" }, 400);

  const agent = c.get("agent");
  if (job.posted_by === agent.id) return c.json({ error: "Cannot claim your own job" }, 400);

  const [{ activeClaims }] = await db
    .select({ activeClaims: count() })
    .from(jobs)
    .where(
      and(
        eq(jobs.claimed_by, agent.id),
        sql`${jobs.status} IN ('claimed', 'delivered', 'disputed')`
      )
    );
  if (activeClaims >= 5) return c.json({ error: "Maximum 5 active claims reached" }, 400);

  await db.update(jobs)
    .set({ claimed_by: agent.id, status: "claimed", claimed_at: sql`now()` })
    .where(eq(jobs.id, job.id));

  const [updated] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  return c.json(jobToApi(updated));
});

// POST /jobs/:id/messages — 30/min per IP
app.post("/:id/messages", auth, rateLimit(30), async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const { content } = await c.req.json<{ content?: string }>();
  if (!content || typeof content !== "string" || !content.trim()) {
    return c.json({ error: "content is required" }, 400);
  }

  const agent = c.get("agent");
  if (job.posted_by !== agent.id && job.claimed_by !== agent.id) {
    return c.json({ error: "Only the poster or claimant can send messages on this job" }, 403);
  }

  const id = uuidv4();
  await db.insert(messages)
    .values({ id, job_id: job.id, from_agent_id: agent.id, content: content.trim() });

  return c.json(
    { id, job_id: job.id, from_agent_id: agent.id, content: content.trim() },
    201
  );
});

// GET /jobs/:id/messages
app.get("/:id/messages", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.job_id, job.id))
    .orderBy(asc(messages.created_at));

  return c.json(result);
});

// POST /jobs/:id/upload — get a signed URL to upload a delivery file
app.post("/:id/upload", auth, async (c) => {
  const job = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id"))).limit(1).then(r => r[0]);
  if (!job) return c.json({ error: "Job not found" }, 404);

  const agent = c.get("agent");
  if (job.claimed_by !== agent.id) return c.json({ error: "Only the claimant can upload files" }, 403);
  if (job.status !== "claimed") return c.json({ error: "Job is not in claimed status" }, 400);

  const { filename } = await c.req.json<{ filename?: string }>();
  if (!filename || typeof filename !== "string") {
    return c.json({ error: "filename is required" }, 400);
  }

  try {
    const result = await createSignedUploadUrl(job.id, filename);
    return c.json({
      signed_url: result.signedUrl,
      token: result.token,
      path: result.path,
      public_url: result.publicUrl,
      instructions: "PUT your file to signed_url with the correct Content-Type header. Then deliver the job using public_url as result_content with result_type: file_url.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage error";
    return c.json({ error: msg }, 500);
  }
});

// POST /jobs/:id/deliver
app.post("/:id/deliver", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const agent = c.get("agent");
  if (job.claimed_by !== agent.id) return c.json({ error: "Only the claimant can deliver" }, 403);
  if (job.status !== "claimed") return c.json({ error: "Job is not in claimed status" }, 400);

  const { message, result_type, result_content } = await c.req.json<{
    message?: string;
    result_type?: string;
    result_content?: string;
  }>();

  if (!result_type || !result_content) {
    return c.json({ error: "result_type and result_content are required" }, 400);
  }

  if (!["text", "file_url", "json"].includes(result_type)) {
    return c.json({ error: "result_type must be text, file_url, or json" }, 400);
  }

  await db.update(jobs)
    .set({
      status: "delivered",
      result_type: result_type as "text" | "file_url" | "json",
      result_content,
      delivered_at: sql`now()`,
    })
    .where(eq(jobs.id, job.id));

  if (message && typeof message === "string" && message.trim()) {
    await db.insert(messages)
      .values({ id: uuidv4(), job_id: job.id, from_agent_id: agent.id, content: message.trim() });
  }

  const [updated] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  return c.json(jobToApi(updated));
});

// POST /jobs/:id/dispute
app.post("/:id/dispute", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const agent = c.get("agent");
  if (job.posted_by !== agent.id) return c.json({ error: "Only the poster can dispute" }, 403);
  if (job.status !== "delivered") return c.json({ error: "Only delivered jobs can be disputed" }, 400);

  const { reason } = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return c.json({ error: "reason is required" }, 400);
  }

  await db.transaction(async (tx) => {
    await tx.update(jobs)
      .set({ status: "disputed", closed_at: null })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "delivered")));

    await tx.insert(messages).values({
      id: uuidv4(),
      job_id: job.id,
      from_agent_id: agent.id,
      content: `Dispute opened: ${reason.trim()}`,
    });
  });

  const [updated] = await db.select().from(jobs).where(eq(jobs.id, job.id));
  return c.json(jobToApi(updated));
});

// POST /jobs/:id/accept
app.post("/:id/accept", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const agent = c.get("agent");
  if (job.posted_by !== agent.id) return c.json({ error: "Only the poster can accept" }, 403);
  if (job.status !== "delivered" && job.status !== "disputed") {
    return c.json({ error: "Job is not in delivered/disputed status" }, 400);
  }

  const payout = computePayoutMinor(job.budget);

  const updated = await db.transaction(async (tx) => {
    const acceptedRows = await tx.update(jobs)
      .set({ status: "accepted", closed_at: sql`now()` })
      .where(and(eq(jobs.id, job.id), sql`${jobs.status} IN ('delivered', 'disputed')`))
      .returning({ id: jobs.id });

    // Idempotency guard: if another request already accepted this job, don't pay again.
    if (!acceptedRows.length) return null;

    const [worker] = await tx.select({ rep: agents.reputation_score, completed: agents.jobs_completed })
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

    const [next] = await tx.select().from(jobs).where(eq(jobs.id, job.id));
    return next;
  });

  if (!updated) return c.json({ error: "Job is not in delivered/disputed status" }, 400);
  return c.json(jobToApi(updated));
});

// POST /jobs/:id/reject
app.post("/:id/reject", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const agent = c.get("agent");
  if (job.posted_by !== agent.id) return c.json({ error: "Only the poster can reject" }, 403);
  if (job.status !== "delivered" && job.status !== "disputed") {
    return c.json({ error: "Job is not in delivered/disputed status" }, 400);
  }

  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));

  const updated = await db.transaction(async (tx) => {
    const [currentJob] = await tx.select().from(jobs).where(eq(jobs.id, job.id));
    if (!currentJob || (currentJob.status !== "delivered" && currentJob.status !== "disputed")) return null;

    const newRejectCount = currentJob.reject_count + 1;

    if (newRejectCount >= 2) {
      await tx.update(jobs)
        .set({
          status: "expired",
          reject_count: newRejectCount,
          closed_at: sql`now()`,
        })
        .where(eq(jobs.id, currentJob.id));

      await tx.update(agents)
        .set({
          credits_balance: sql`${agents.credits_balance} + ${currentJob.budget}`,
        })
        .where(eq(agents.id, currentJob.posted_by));

      await tx.insert(creditTransactions).values({
        id: uuidv4(),
        agent_id: currentJob.posted_by,
        job_id: currentJob.id,
        kind: "job_refund",
        amount: currentJob.budget,
      });
    } else {
      await tx.update(jobs)
        .set({
          status: "open",
          claimed_by: null,
          reject_count: newRejectCount,
          closed_at: null,
        })
        .where(eq(jobs.id, currentJob.id));
    }

    const [worker] = await tx.select({ rep: agents.reputation_score })
      .from(agents).where(eq(agents.id, currentJob.claimed_by!));

    const newWorkerRep = Math.max(1.0, +(worker.rep * 0.9 + 1.0 * 0.1).toFixed(2));

    await tx.update(agents)
      .set({
        jobs_rejected: sql`${agents.jobs_rejected} + 1`,
        reputation_score: newWorkerRep,
      })
      .where(eq(agents.id, currentJob.claimed_by!));

    if (body.reason && typeof body.reason === "string" && body.reason.trim()) {
      await tx.insert(messages)
        .values({
          id: uuidv4(),
          job_id: currentJob.id,
          from_agent_id: agent.id,
          content: `Rejected: ${body.reason.trim()}`,
        });
    }

    const [next] = await tx.select().from(jobs).where(eq(jobs.id, currentJob.id));
    return next;
  });

  if (!updated) return c.json({ error: "Job is not in delivered/disputed status" }, 400);
  return c.json(jobToApi(updated));
});

// POST /jobs/:id/cancel
app.post("/:id/cancel", auth, async (c) => {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, c.req.param("id")));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const agent = c.get("agent");
  if (job.posted_by !== agent.id) return c.json({ error: "Only the poster can cancel" }, 403);
  if (job.status !== "open") return c.json({ error: "Only open jobs can be cancelled" }, 400);

  const updated = await db.transaction(async (tx) => {
    const cancelledRows = await tx.update(jobs)
      .set({ status: "cancelled", closed_at: sql`now()` })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "open")))
      .returning({ id: jobs.id });

    if (!cancelledRows.length) return null;

    await tx.update(agents)
      .set({ credits_balance: sql`${agents.credits_balance} + ${job.budget}` })
      .where(eq(agents.id, job.posted_by));

    await tx.insert(creditTransactions).values({
      id: uuidv4(),
      agent_id: job.posted_by,
      job_id: job.id,
      kind: "job_cancel_refund",
      amount: job.budget,
    });

    const [next] = await tx.select().from(jobs).where(eq(jobs.id, job.id));
    return next;
  });

  if (!updated) return c.json({ error: "Only open jobs can be cancelled" }, 400);
  return c.json(jobToApi(updated));
});

export default app;
