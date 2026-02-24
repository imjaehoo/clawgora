import "./setup.js";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { NextRequest } from "next/server";

// Set admin secret before importing route handlers
process.env.ADMIN_SECRET = "test-secret";

import { GET as getAgents } from "../app/api/admin/agents/route.js";
import { GET as getJobs } from "../app/api/admin/jobs/route.js";
import { POST as postCredits } from "../app/api/admin/credits/route.js";

function req(method: string, url: string, opts: { secret?: string; body?: unknown } = {}) {
  return new NextRequest(`http://localhost:3001${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(opts.secret ? { "x-admin-secret": opts.secret } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

const SECRET = "test-secret";

// --- auth guard tests ---

test("admin: rejects missing secret on agents", async () => {
  const res = await getAgents(req("GET", "/api/admin/agents"));
  assert.equal(res.status, 401);
});

test("admin: rejects wrong secret on agents", async () => {
  const res = await getAgents(req("GET", "/api/admin/agents", { secret: "wrong" }));
  assert.equal(res.status, 401);
});

test("admin: rejects missing secret on credits", async () => {
  const res = await postCredits(req("POST", "/api/admin/credits"));
  assert.equal(res.status, 401);
});

// --- agents ---

test("admin: GET /agents returns array", async () => {
  const res = await getAgents(req("GET", "/api/admin/agents", { secret: SECRET }));
  assert.equal(res.status, 200);
  const body = await res.json() as unknown[];
  assert.ok(Array.isArray(body));
});

// --- jobs ---

test("admin: GET /jobs returns array", async () => {
  const res = await getJobs(req("GET", "/api/admin/jobs", { secret: SECRET }));
  assert.equal(res.status, 200);
  const body = await res.json() as unknown[];
  assert.ok(Array.isArray(body));
});

test("admin: GET /jobs?status=open returns only open jobs", async () => {
  const res = await getJobs(req("GET", "/api/admin/jobs?status=open", { secret: SECRET }));
  assert.equal(res.status, 200);
  const body = await res.json() as { status: string }[];
  assert.ok(body.every((j) => j.status === "open"));
});

// --- credits ---

test("admin: POST /credits validates required fields", async () => {
  const res = await postCredits(req("POST", "/api/admin/credits", {
    secret: SECRET,
    body: { agent_id: "x" },
  }));
  assert.equal(res.status, 400);
});

test("admin: POST /credits requires reason", async () => {
  const res = await postCredits(req("POST", "/api/admin/credits", {
    secret: SECRET,
    body: { agent_id: "x", amount_minor: 100 },
  }));
  assert.equal(res.status, 400);
  const body = await res.json() as { error: string };
  assert.match(body.error, /reason/);
});

test("admin: POST /credits returns 404 for unknown agent", async () => {
  const res = await postCredits(req("POST", "/api/admin/credits", {
    secret: SECRET,
    body: { agent_id: "00000000-0000-0000-0000-000000000000", amount_minor: 500, reason: "test" },
  }));
  assert.equal(res.status, 404);
});
