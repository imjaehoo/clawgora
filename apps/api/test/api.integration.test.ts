import { test } from "node:test";
import * as assert from "node:assert/strict";
import { Hono } from "hono";
import agentsApp from "../src/routes/agents.js";
import jobsApp from "../src/routes/jobs.js";

const app = new Hono();
app.route("/agents", agentsApp);
app.route("/jobs", jobsApp);

async function registerAgent(skills: string, name?: string) {
  const res = await app.request("/agents/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ skills, name }),
  });

  assert.equal(res.status, 201);
  const body = await res.json() as { agent_id: string; api_key: string };
  assert.ok(body.agent_id);
  assert.ok(body.api_key);
  return body;
}

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

  const claimRes = await app.request(`/jobs/${created.id}/claim`, {
    method: "POST",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });
  assert.equal(claimRes.status, 200);

  const deliverRes = await app.request(`/jobs/${created.id}/deliver`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${worker.api_key}`,
    },
    body: JSON.stringify({ result_type: "text", result_content: "Delivered hooks" }),
  });
  assert.equal(deliverRes.status, 200);

  const acceptRes = await app.request(`/jobs/${created.id}/accept`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  assert.equal(acceptRes.status, 200);

  const workerMeRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });
  const workerMe = await workerMeRes.json() as { credits_balance: number; jobs_completed: number };
  assert.equal(workerMe.credits_balance, 145);
  assert.equal(workerMe.jobs_completed, 1);

  const posterMeRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  const posterMe = await posterMeRes.json() as { credits_balance: number; jobs_completed: number };
  assert.equal(posterMe.credits_balance, 50);
  assert.equal(posterMe.jobs_completed, 1);

  const secondAcceptRes = await app.request(`/jobs/${created.id}/accept`, {
    method: "POST",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  assert.equal(secondAcceptRes.status, 400);

  const workerMeAgainRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });
  const workerMeAgain = await workerMeAgainRes.json() as { credits_balance: number; jobs_completed: number };
  assert.equal(workerMeAgain.credits_balance, 145);
  assert.equal(workerMeAgain.jobs_completed, 1);
});

test("API integration: reject twice expires and refunds poster", async () => {
  const poster = await registerAgent("code", "poster-reject");
  const worker = await registerAgent("code", "worker-reject");

  const createRes = await app.request("/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({
      title: "Fix flaky test",
      description: "Stabilize suite",
      category: "code",
      budget: 40,
      deadline_minutes: 60,
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as { id: string };

  const doClaimDeliver = async () => {
    const claimRes = await app.request(`/jobs/${created.id}/claim`, {
      method: "POST",
      headers: { authorization: `Bearer ${worker.api_key}` },
    });
    assert.equal(claimRes.status, 200);

    const deliverRes = await app.request(`/jobs/${created.id}/deliver`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${worker.api_key}`,
      },
      body: JSON.stringify({ result_type: "text", result_content: "Attempt delivery" }),
    });
    assert.equal(deliverRes.status, 200);
  };

  await doClaimDeliver();

  const firstRejectRes = await app.request(`/jobs/${created.id}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({ reason: "Needs better quality" }),
  });
  assert.equal(firstRejectRes.status, 200);
  const firstRejected = await firstRejectRes.json() as { status: string; reject_count: number; claimed_by: string | null };
  assert.equal(firstRejected.status, "open");
  assert.equal(firstRejected.reject_count, 1);
  assert.equal(firstRejected.claimed_by, null);

  await doClaimDeliver();

  const secondRejectRes = await app.request(`/jobs/${created.id}/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${poster.api_key}`,
    },
    body: JSON.stringify({ reason: "Still not enough" }),
  });
  assert.equal(secondRejectRes.status, 200);
  const secondRejected = await secondRejectRes.json() as { status: string; reject_count: number };
  assert.equal(secondRejected.status, "expired");
  assert.equal(secondRejected.reject_count, 2);

  const posterMeRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${poster.api_key}` },
  });
  const posterMe = await posterMeRes.json() as { credits_balance: number };
  assert.equal(posterMe.credits_balance, 100);

  const workerMeRes = await app.request("/agents/me", {
    method: "GET",
    headers: { authorization: `Bearer ${worker.api_key}` },
  });
  const workerMe = await workerMeRes.json() as { jobs_rejected: number };
  assert.equal(workerMe.jobs_rejected, 2);
});
