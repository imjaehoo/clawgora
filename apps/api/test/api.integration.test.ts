import { test, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { like, or, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../src/db/index.js";
import { agents, jobs, messages, creditTransactions } from "../src/db/schema.js";
import agentsApp from "../src/routes/agents.js";
import jobsApp from "../src/routes/jobs.js";

const app = new Hono();
app.route("/agents", agentsApp);
app.route("/jobs", jobsApp);

// ── Cleanup ──────────────────────────────────────────────────────────────────

const TEST_PREFIX = "__test__";

async function cleanupTestData() {
  const testAgents = await db
    .select({ id: agents.id })
    .from(agents)
    .where(like(agents.name, `${TEST_PREFIX}%`));

  if (testAgents.length === 0) return;
  const agentIds = testAgents.map((a) => a.id);

  // Find jobs tied to test agents
  const testJobs = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(or(inArray(jobs.posted_by, agentIds), inArray(jobs.claimed_by, agentIds)));

  const jobIds = testJobs.map((j) => j.id);

  // Delete in FK order: transactions → messages → jobs → agents
  if (jobIds.length > 0) {
    await db.delete(creditTransactions).where(inArray(creditTransactions.job_id, jobIds));
    await db.delete(messages).where(inArray(messages.job_id, jobIds));
  }
  await db.delete(creditTransactions).where(inArray(creditTransactions.agent_id, agentIds));
  await db.delete(jobs).where(or(inArray(jobs.posted_by, agentIds), inArray(jobs.claimed_by, agentIds)));
  await db.delete(agents).where(inArray(agents.id, agentIds));
}

before(cleanupTestData); // sweep prior-run leftovers
after(cleanupTestData);  // sweep current run

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAgent(skills: string, name?: string) {
  const res = await app.request("/agents/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ skills, name: name ? `${TEST_PREFIX}${name}` : undefined }),
  });

  assert.equal(res.status, 201);
  const body = await res.json() as { agent_id: string; api_key: string };
  assert.ok(body.agent_id);
  assert.ok(body.api_key);
  return body;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("API integration: register -> create job -> claim job", async () => {
  const poster = await registerAgent("writing,code", "poster");
  const worker = await registerAgent("code", "worker");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({
      title: "Write parser tests",
      description: "Need robust coverage for parser edge cases",
      category: "code",
      budget: 25,
      deadline_minutes: 120,
    }),
  });

  assert.equal(createRes.status, 201);
  const created = await createRes.json() as { id: string; status: string; posted_by: string };
  assert.ok(created.id);
  assert.equal(created.status, "open");
  assert.equal(created.posted_by, poster.agent_id);

  const claimRes = await app.request(`/jobs/${created.id}/claim`, {
    method: "POST",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });

  assert.equal(claimRes.status, 200);
  const claimed = await claimRes.json() as { id: string; status: string; claimed_by: string };
  assert.equal(claimed.id, created.id);
  assert.equal(claimed.status, "claimed");
  assert.equal(claimed.claimed_by, worker.agent_id);
});

test("API integration: create job supports decimal budget", async () => {
  const poster = await registerAgent("research", "decimal-poster");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({
      title: "Decimal budget job",
      description: "Budget with cents",
      category: "research",
      budget: 10.25,
      deadline_minutes: 30,
    }),
  });

  assert.equal(createRes.status, 201);
  const body = await createRes.json() as { budget: number };
  assert.equal(body.budget, 10.25);

  const meRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  const me = await meRes.json() as { credits_balance: number };
  assert.equal(me.credits_balance, 89.75);
});

test("API integration: create job validation error", async () => {
  const poster = await registerAgent("research", "validator");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({
      title: "Bad payload",
      description: "Missing required fields",
      category: "code",
      budget: 10,
    }),
  });

  assert.equal(createRes.status, 400);
  const body = await createRes.json() as { error: string };
  assert.match(body.error, /Missing required fields/);
});

test("API integration: deliver -> accept pays worker once", async () => {
  const poster = await registerAgent("writing", "poster-accept");
  const worker = await registerAgent("writing", "worker-accept");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({
      title: "Write ad copy",
      description: "Need 3 hooks",
      category: "writing",
      budget: 50,
      deadline_minutes: 90,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as { id: string };

  await app.request(`/jobs/${created.id}/claim`, {
    method: "POST",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });

  await app.request(`/jobs/${created.id}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${worker.api_key}` },
    body: JSON.stringify({ result_type: "text", result_content: "Delivered hooks" }),
  });

  const acceptRes = await app.request(`/jobs/${created.id}/accept`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  assert.equal(acceptRes.status, 200);

  const workerMe = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  })).json() as { credits_balance: number; jobs_completed: number };
  assert.equal(workerMe.credits_balance, 145);
  assert.equal(workerMe.jobs_completed, 1);

  const posterMe = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).json() as { credits_balance: number; jobs_completed: number };
  assert.equal(posterMe.credits_balance, 50);
  assert.equal(posterMe.jobs_completed, 1);

  // Idempotency: second accept must fail, balances unchanged
  assert.equal((await app.request(`/jobs/${created.id}/accept`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).status, 400);

  const workerMeAgain = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  })).json() as { credits_balance: number; jobs_completed: number };
  assert.equal(workerMeAgain.credits_balance, 145);
  assert.equal(workerMeAgain.jobs_completed, 1);
});

test("API integration: cancel open job refunds poster", async () => {
  const poster = await registerAgent("research", "poster-cancel");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Cancel me", description: "To be cancelled", category: "research", budget: 20, deadline_minutes: 30 }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as { id: string };

  const cancelRes = await app.request(`/jobs/${created.id}/cancel`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  assert.equal(cancelRes.status, 200);
  assert.equal((await cancelRes.json() as { status: string }).status, "cancelled");

  const me = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).json() as { credits_balance: number };
  assert.equal(me.credits_balance, 100);
});

test("API integration: cannot cancel claimed job", async () => {
  const poster = await registerAgent("research", "poster-cancel2");
  const worker = await registerAgent("research", "worker-cancel2");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Claimed job", description: "Already claimed", category: "research", budget: 20, deadline_minutes: 30 }),
  });
  const created = await createRes.json() as { id: string };

  await app.request(`/jobs/${created.id}/claim`, {
    method: "POST",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });

  assert.equal((await app.request(`/jobs/${created.id}/cancel`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).status, 400);
});

test("API integration: ledger returns agent transactions", async () => {
  const poster = await registerAgent("code", "poster-ledger");

  await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Ledger test", description: "Check ledger", category: "code", budget: 10, deadline_minutes: 60 }),
  });

  const rows = await (await app.request("/agents/me/ledger", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).json() as { kind: string; amount: number }[];

  assert.ok(rows.length >= 2);
  assert.ok(rows.some((r) => r.kind === "signup_grant" && r.amount === 100));
  assert.ok(rows.some((r) => r.kind === "job_post_lock" && r.amount === -10));
});

test("API integration: rotate key invalidates old key", async () => {
  const agent = await registerAgent("code", "rotate-key");

  const rotateRes = await app.request("/agents/me/rotate-key", {
    method: "POST",
    headers: { authorization: `Bearer ${agent.api_key}` },
  });

  assert.equal(rotateRes.status, 200);
  const rotateBody = await rotateRes.json() as { agent_id: string; api_key: string; rotated_at: string };
  assert.equal(rotateBody.agent_id, agent.agent_id);
  assert.ok(rotateBody.api_key.startsWith("clawgora_"));
  assert.notEqual(rotateBody.api_key, agent.api_key);
  assert.ok(rotateBody.rotated_at);

  const oldKeyRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${agent.api_key}` },
  });
  assert.equal(oldKeyRes.status, 401);

  const newKeyRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${rotateBody.api_key}` },
  });
  assert.equal(newKeyRes.status, 200);
});

test("API integration: reputation increases on accept", async () => {
  const poster = await registerAgent("writing", "poster-rep");
  const worker = await registerAgent("writing", "worker-rep");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Rep test", description: "Good work", category: "writing", budget: 10, deadline_minutes: 60 }),
  });
  const created = await createRes.json() as { id: string };

  await app.request(`/jobs/${created.id}/claim`, { method: "POST", headers: { authorization: `Bearer ${worker.api_key}` } });
  await app.request(`/jobs/${created.id}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${worker.api_key}` },
    body: JSON.stringify({ result_type: "text", result_content: "Done" }),
  });
  await app.request(`/jobs/${created.id}/accept`, { method: "POST", headers: { authorization: `Bearer ${poster.api_key}` } });

  const me = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  })).json() as { reputation_score: number };
  assert.ok(me.reputation_score === 5, `Expected 5, got ${me.reputation_score}`);
});

test("API integration: reputation decreases on reject", async () => {
  const poster = await registerAgent("writing", "poster-rep-rej");
  const worker = await registerAgent("writing", "worker-rep-rej");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Rep reject test", description: "Bad work", category: "writing", budget: 10, deadline_minutes: 60 }),
  });
  const created = await createRes.json() as { id: string };

  await app.request(`/jobs/${created.id}/claim`, { method: "POST", headers: { authorization: `Bearer ${worker.api_key}` } });
  await app.request(`/jobs/${created.id}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${worker.api_key}` },
    body: JSON.stringify({ result_type: "text", result_content: "Subpar" }),
  });
  await app.request(`/jobs/${created.id}/reject`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ reason: "Not good enough" }),
  });

  const me = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  })).json() as { reputation_score: number };
  // EMA: 5.0 * 0.9 + 1.0 * 0.1 = 4.6
  assert.equal(me.reputation_score, 4.6);
});

test("API integration: dispute freezes delivery and allows accept", async () => {
  const poster = await registerAgent("writing", "poster-dispute");
  const worker = await registerAgent("writing", "worker-dispute");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Dispute test", description: "Needs review", category: "writing", budget: 20, deadline_minutes: 60 }),
  });
  const created = await createRes.json() as { id: string };

  await app.request(`/jobs/${created.id}/claim`, { method: "POST", headers: { authorization: `Bearer ${worker.api_key}` } });
  await app.request(`/jobs/${created.id}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${worker.api_key}` },
    body: JSON.stringify({ result_type: "text", result_content: "Initial delivery" }),
  });

  const disputeRes = await app.request(`/jobs/${created.id}/dispute`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ reason: "Need revisions" }),
  });
  assert.equal(disputeRes.status, 200);
  const disputed = await disputeRes.json() as { status: string };
  assert.equal(disputed.status, "disputed");

  const msgs = await (await app.request(`/jobs/${created.id}/messages`, {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).json() as { content: string }[];
  assert.ok(msgs.some((m) => m.content.includes("Dispute opened:")));

  const acceptRes = await app.request(`/jobs/${created.id}/accept`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  assert.equal(acceptRes.status, 200);
  const accepted = await acceptRes.json() as { status: string };
  assert.equal(accepted.status, "accepted");
});

test("API integration: reject twice expires and refunds poster", async () => {
  const poster = await registerAgent("code", "poster-reject");
  const worker = await registerAgent("code", "worker-reject");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ title: "Fix flaky test", description: "Stabilize suite", category: "code", budget: 40, deadline_minutes: 60 }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as { id: string };

  const doClaimDeliver = async () => {
    assert.equal((await app.request(`/jobs/${created.id}/claim`, {
      method: "POST",
      headers: { authorization: `Bearer ${worker.api_key}` },
    })).status, 200);
    assert.equal((await app.request(`/jobs/${created.id}/deliver`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${worker.api_key}` },
      body: JSON.stringify({ result_type: "text", result_content: "Attempt delivery" }),
    })).status, 200);
  };

  await doClaimDeliver();

  const firstRejected = await (await app.request(`/jobs/${created.id}/reject`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ reason: "Needs better quality" }),
  })).json() as { status: string; reject_count: number; claimed_by: string | null };
  assert.equal(firstRejected.status, "open");
  assert.equal(firstRejected.reject_count, 1);
  assert.equal(firstRejected.claimed_by, null);

  await doClaimDeliver();

  const secondRejected = await (await app.request(`/jobs/${created.id}/reject`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${poster.api_key}` },
    body: JSON.stringify({ reason: "Still not enough" }),
  })).json() as { status: string; reject_count: number };
  assert.equal(secondRejected.status, "expired");
  assert.equal(secondRejected.reject_count, 2);

  const posterMe = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  })).json() as { credits_balance: number };
  assert.equal(posterMe.credits_balance, 100);

  const workerMe = await (await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  })).json() as { jobs_rejected: number };
  assert.equal(workerMe.jobs_rejected, 2);
});
