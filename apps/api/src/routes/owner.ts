import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { eq, and, or, inArray, sql, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, jobs, messages, creditTransactions, ownerAgents, owners } from "../db/schema.js";
import { fromMinorUnits, computePayoutMinor } from "../lib/money.js";

const app = new Hono();

// ---------- Supabase JWT auth middleware ----------

async function getSupabaseUser(authHeader: string | undefined) {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

// Middleware: require authenticated owner
app.use("/*", async (c, next) => {
  const user = await getSupabaseUser(c.req.header("Authorization"));
  if (!user || !user.email) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Upsert owner row on first access
  await db
    .insert(owners)
    .values({ id: user.id, email: user.email })
    .onConflictDoNothing();

  c.set("ownerId" as never, user.id);
  await next();
});

function getOwnerId(c: any): string {
  return c.get("ownerId");
}

// Helper: get agent IDs for this owner, optionally filtered to one agent
async function ownerAgentIds(ownerId: string, filterAgent?: string): Promise<string[]> {
  const rows = await db
    .select({ agent_id: ownerAgents.agent_id })
    .from(ownerAgents)
    .where(eq(ownerAgents.owner_id, ownerId));
  const ids = rows.map((r) => r.agent_id);
  if (filterAgent && ids.includes(filterAgent)) return [filterAgent];
  return ids;
}

// ---------- POST /owner/agents/claim ----------
app.post("/agents/claim", async (c) => {
  const ownerId = getOwnerId(c);
  const { api_key, label } = await c.req.json<{ api_key: string; label?: string }>();

  if (!api_key || typeof api_key !== "string") {
    return c.json({ error: "api_key is required" }, 400);
  }

  const [agent] = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.api_key, api_key));

  if (!agent) {
    return c.json({ error: "Invalid API key" }, 404);
  }

  // Check if already claimed by anyone
  const [existing] = await db
    .select()
    .from(ownerAgents)
    .where(eq(ownerAgents.agent_id, agent.id));

  if (existing) {
    if (existing.owner_id === ownerId) {
      return c.json({ error: "You already claimed this agent" }, 409);
    }
    return c.json({ error: "This agent is already claimed by another owner" }, 409);
  }

  await db.insert(ownerAgents).values({
    owner_id: ownerId,
    agent_id: agent.id,
    label: label || null,
  });

  return c.json({ ok: true, agent_id: agent.id, name: agent.name }, 201);
});

// ---------- DELETE /owner/agents/:agentId ----------
app.delete("/agents/:agentId", async (c) => {
  const ownerId = getOwnerId(c);
  const agentId = c.req.param("agentId");

  await db
    .delete(ownerAgents)
    .where(sql`${ownerAgents.owner_id} = ${ownerId} AND ${ownerAgents.agent_id} = ${agentId}`);

  return c.json({ ok: true });
});

// ---------- GET /owner/agents ----------
app.get("/agents", async (c) => {
  const ownerId = getOwnerId(c);

  const rows = await db
    .select({
      agent_id: ownerAgents.agent_id,
      label: ownerAgents.label,
      claimed_at: ownerAgents.claimed_at,
      name: agents.name,
      credits_balance: agents.credits_balance,
      reputation_score: agents.reputation_score,
      jobs_completed: agents.jobs_completed,
      jobs_rejected: agents.jobs_rejected,
      skills: agents.skills,
    })
    .from(ownerAgents)
    .innerJoin(agents, eq(ownerAgents.agent_id, agents.id))
    .where(eq(ownerAgents.owner_id, ownerId));

  return c.json(
    rows.map((r) => ({ ...r, credits_balance: fromMinorUnits(r.credits_balance) }))
  );
});

// ---------- GET /owner/overview ----------
app.get("/overview", async (c) => {
  const ownerId = getOwnerId(c);
  const agentIds = await ownerAgentIds(ownerId, c.req.query("agent"));

  if (agentIds.length === 0) {
    return c.json({
      agents_count: 0,
      total_credits: 0,
      jobs_posted: 0,
      jobs_worked: 0,
      pending_review: 0,
    });
  }

  const agentRows = await db
    .select({ credits_balance: agents.credits_balance })
    .from(agents)
    .where(inArray(agents.id, agentIds));

  const totalCredits = agentRows.reduce((sum, r) => sum + r.credits_balance, 0);

  const [{ count: posted }] = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(inArray(jobs.posted_by, agentIds));
  const [{ count: worked }] = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(inArray(jobs.claimed_by, agentIds));
  const [{ count: pending }] = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(
    and(inArray(jobs.posted_by, agentIds), eq(jobs.status, "delivered"))
  );

  return c.json({
    agents_count: agentIds.length,
    total_credits: fromMinorUnits(totalCredits),
    jobs_posted: Number(posted),
    jobs_worked: Number(worked),
    pending_review: Number(pending),
  });
});

// ---------- GET /owner/jobs ----------
app.get("/jobs", async (c) => {
  const ownerId = getOwnerId(c);
  const agentIds = await ownerAgentIds(ownerId, c.req.query("agent"));
  const role = c.req.query("role"); // poster | worker
  const status = c.req.query("status");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);

  if (agentIds.length === 0) return c.json([]);

  let condition;
  if (role === "poster") {
    condition = inArray(jobs.posted_by, agentIds);
  } else if (role === "worker") {
    condition = inArray(jobs.claimed_by, agentIds);
  } else {
    condition = or(inArray(jobs.posted_by, agentIds), inArray(jobs.claimed_by, agentIds))!;
  }

  let rows = await db
    .select()
    .from(jobs)
    .where(condition)
    .orderBy(desc(jobs.created_at))
    .limit(limit);

  if (status) {
    rows = rows.filter((r) => r.status === status);
  }

  return c.json(rows.map((r) => ({ ...r, budget: fromMinorUnits(r.budget) })));
});

// ---------- GET /owner/ledger ----------
app.get("/ledger", async (c) => {
  const ownerId = getOwnerId(c);
  const agentIds = await ownerAgentIds(ownerId, c.req.query("agent"));
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);

  if (agentIds.length === 0) return c.json([]);

  const rows = await db
    .select()
    .from(creditTransactions)
    .where(inArray(creditTransactions.agent_id, agentIds))
    .orderBy(desc(creditTransactions.created_at))
    .limit(limit);

  return c.json(rows.map((r) => ({ ...r, amount: fromMinorUnits(r.amount) })));
});

// ---------- GET /owner/inbox ----------
app.get("/inbox", async (c) => {
  const ownerId = getOwnerId(c);
  const agentIds = await ownerAgentIds(ownerId, c.req.query("agent"));

  if (agentIds.length === 0) return c.json({ pending_review: [], active_work: [] });

  const pendingReview = await db
    .select()
    .from(jobs)
    .where(and(inArray(jobs.posted_by, agentIds), eq(jobs.status, "delivered")))
    .orderBy(desc(jobs.delivered_at));

  const activeWork = await db
    .select()
    .from(jobs)
    .where(and(inArray(jobs.claimed_by, agentIds), inArray(jobs.status, ["claimed", "delivered"])))
    .orderBy(desc(jobs.claimed_at));

  return c.json({
    pending_review: pendingReview.map((r) => ({ ...r, budget: fromMinorUnits(r.budget) })),
    active_work: activeWork.map((r) => ({ ...r, budget: fromMinorUnits(r.budget) })),
  });
});

// ---------- POST /owner/jobs/:id/accept ----------
app.post("/jobs/:id/accept", async (c) => {
  const ownerId = getOwnerId(c);
  const agentIds = await ownerAgentIds(ownerId);
  const jobId = c.req.param("id");

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return c.json({ error: "Job not found" }, 404);
  if (!agentIds.includes(job.posted_by)) return c.json({ error: "Not your agent's job" }, 403);
  if (job.status !== "delivered" && job.status !== "disputed") {
    return c.json({ error: "Job is not in delivered/disputed status" }, 400);
  }

  const payout = computePayoutMinor(job.budget);

  const updated = await db.transaction(async (tx) => {
    const acceptedRows = await tx.update(jobs)
      .set({ status: "accepted", closed_at: sql`now()` })
      .where(and(eq(jobs.id, job.id), sql`${jobs.status} IN ('delivered', 'disputed')`))
      .returning({ id: jobs.id });

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
  return c.json({ ...updated, budget: fromMinorUnits(updated.budget) });
});

// ---------- POST /owner/jobs/:id/reject ----------
app.post("/jobs/:id/reject", async (c) => {
  const ownerId = getOwnerId(c);
  const agentIds = await ownerAgentIds(ownerId);
  const jobId = c.req.param("id");

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return c.json({ error: "Job not found" }, 404);
  if (!agentIds.includes(job.posted_by)) return c.json({ error: "Not your agent's job" }, 403);
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
        .set({ status: "expired", reject_count: newRejectCount, closed_at: sql`now()` })
        .where(eq(jobs.id, currentJob.id));

      await tx.update(agents)
        .set({ credits_balance: sql`${agents.credits_balance} + ${currentJob.budget}` })
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
        .set({ status: "open", claimed_by: null, reject_count: newRejectCount, closed_at: null })
        .where(eq(jobs.id, currentJob.id));
    }

    const [worker] = await tx.select({ rep: agents.reputation_score })
      .from(agents).where(eq(agents.id, currentJob.claimed_by!));

    const newWorkerRep = Math.max(1.0, +(worker.rep * 0.9 + 1.0 * 0.1).toFixed(2));

    await tx.update(agents)
      .set({ jobs_rejected: sql`${agents.jobs_rejected} + 1`, reputation_score: newWorkerRep })
      .where(eq(agents.id, currentJob.claimed_by!));

    const [next] = await tx.select().from(jobs).where(eq(jobs.id, currentJob.id));
    return next;
  });

  if (!updated) return c.json({ error: "Job is not in delivered/disputed status" }, 400);
  return c.json({ ...updated, budget: fromMinorUnits(updated.budget) });
});

export default app;
