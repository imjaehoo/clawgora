import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { eq, desc, sql, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, jobs, messages, creditTransactions, type Agent } from "../db/schema.js";
import { auth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { runAutoMaintenance } from "../lib/maintenance.js";
import { fromMinorUnits } from "../lib/money.js";

type Env = { Variables: { agent: Agent } };

const app = new Hono<Env>();

function agentToApi<T extends { credits_balance: number }>(agent: T): T & { credits_balance: number } {
  return { ...agent, credits_balance: fromMinorUnits(agent.credits_balance) };
}

function jobToApi<T extends { budget: number }>(job: T): T & { budget: number } {
  return { ...job, budget: fromMinorUnits(job.budget) };
}

// POST /agents/register (no auth) — tight limit: 10/min per IP
app.post("/register", rateLimit(10), async (c) => {
  const { name, skills } = await c.req.json<{ name?: string; skills?: string }>();

  if (!skills || typeof skills !== "string" || !skills.trim()) {
    return c.json({ error: "skills is required (string)" }, 400);
  }

  const id = uuidv4();
  const apiKey = `clawgora_${crypto.randomBytes(32).toString("hex")}`;

  await db.transaction(async (tx) => {
    await tx.insert(agents)
      .values({ id, name: name || null, api_key: apiKey, skills: skills.trim(), credits_balance: 10000 });

    await tx.insert(creditTransactions).values({
      id: uuidv4(),
      agent_id: id,
      job_id: null,
      kind: "signup_grant",
      amount: 10000,
    });
  });

  return c.json({ agent_id: id, api_key: apiKey, credits_balance: 100 }, 201);
});

// PUT /agents/me/skills
app.put("/me/skills", auth, async (c) => {
  const { skills } = await c.req.json<{ skills?: string }>();

  if (!skills || typeof skills !== "string" || !skills.trim()) {
    return c.json({ error: "skills is required (string)" }, 400);
  }

  const agent = c.get("agent");
  await db.update(agents)
    .set({ skills: skills.trim() })
    .where(eq(agents.id, agent.id));

  return c.json({ ok: true });
});

// GET /agents/me
app.get("/me", auth, (c) => {
  const { api_key, ...profile } = c.get("agent");
  return c.json(agentToApi(profile));
});

// POST /agents/me/rotate-key
app.post("/me/rotate-key", auth, async (c) => {
  const agent = c.get("agent");
  const newApiKey = `clawgora_${crypto.randomBytes(32).toString("hex")}`;

  await db.update(agents)
    .set({ api_key: newApiKey })
    .where(eq(agents.id, agent.id));

  return c.json({
    agent_id: agent.id,
    api_key: newApiKey,
    rotated_at: new Date().toISOString(),
  });
});

// GET /agents/me/inbox
app.get("/me/inbox", auth, async (c) => {
  await runAutoMaintenance();

  const agentId = c.get("agent").id;

  const open_jobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "open"))
    .orderBy(desc(jobs.created_at));

  const active_jobs = await db
    .select()
    .from(jobs)
    .where(
      sql`${jobs.claimed_by} = ${agentId} AND ${jobs.status} IN ('claimed', 'delivered')`
    )
    .orderBy(desc(jobs.created_at));

  const delivered_jobs = await db
    .select()
    .from(jobs)
    .where(
      sql`${jobs.posted_by} = ${agentId} AND ${jobs.status} = 'delivered'`
    )
    .orderBy(desc(jobs.delivered_at));

  const new_messages = (await db
    .select({ messages })
    .from(messages)
    .innerJoin(jobs, eq(messages.job_id, jobs.id))
    .where(
      sql`${jobs.posted_by} = ${agentId} OR ${jobs.claimed_by} = ${agentId}`
    )
    .orderBy(desc(messages.created_at))
    .limit(50))
    .map((r) => r.messages);

  return c.json({
    open_jobs: open_jobs.map(jobToApi),
    active_jobs: active_jobs.map(jobToApi),
    delivered_jobs: delivered_jobs.map(jobToApi),
    new_messages,
  });
});

// GET /agents/me/ledger
app.get("/me/ledger", auth, async (c) => {
  const agentId = c.get("agent").id;
  const { limit = "50", order = "desc" } = c.req.query();

  const rows = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.agent_id, agentId))
    .orderBy(order === "asc" ? asc(creditTransactions.created_at) : desc(creditTransactions.created_at))
    .limit(Math.min(parseInt(limit), 200));

  return c.json(rows.map((r) => ({ ...r, amount: fromMinorUnits(r.amount) })));
});

export default app;
