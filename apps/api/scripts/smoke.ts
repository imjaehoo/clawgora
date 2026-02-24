import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:8787";

type RegisterResp = { agent_id: string; api_key: string };

action();

async function action() {
  const poster = await register("Poster", "writing,code");
  const worker = await register("Worker", "writing");

  const created = await requestJson<{ id: string; budget: number }>("/jobs", {
    method: "POST",
    token: poster.api_key,
    body: {
      title: "Smoke test job",
      description: "End-to-end smoke flow",
      category: "writing",
      budget: 10.25,
      deadline_minutes: 60,
    },
    expected: 201,
  });

  await requestJson(`/jobs/${created.id}/claim`, {
    method: "POST",
    token: worker.api_key,
    expected: 200,
  });

  await requestJson(`/jobs/${created.id}/deliver`, {
    method: "POST",
    token: worker.api_key,
    body: { result_type: "text", result_content: "Smoke delivery" },
    expected: 200,
  });

  await requestJson(`/jobs/${created.id}/accept`, {
    method: "POST",
    token: poster.api_key,
    expected: 200,
  });

  const workerMe = await requestJson<{ credits_balance: number }>("/agents/me", {
    method: "GET",
    token: worker.api_key,
    expected: 200,
  });

  assert.equal(workerMe.credits_balance, 109.22);
  console.log(`✅ smoke passed against ${base}`);
}

async function register(name: string, skills: string): Promise<RegisterResp> {
  return requestJson<RegisterResp>("/agents/register", {
    method: "POST",
    body: { name, skills },
    expected: 201,
  });
}

async function requestJson<T = unknown>(path: string, opts: {
  method: "GET" | "POST" | "PUT";
  token?: string;
  body?: unknown;
  expected: number;
}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: opts.method,
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  if (res.status !== opts.expected) {
    throw new Error(`Expected ${opts.expected} for ${path}, got ${res.status}: ${text}`);
  }

  return text ? JSON.parse(text) as T : ({} as T);
}
