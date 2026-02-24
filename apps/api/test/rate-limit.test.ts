import { test, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { Hono } from "hono";
import { rateLimit, globalRateLimit } from "../src/middleware/rate-limit.js";

// Override env so rate limiting is active for these tests
before(() => { process.env.RATE_LIMIT_DISABLED = "false"; });
after(() => { process.env.RATE_LIMIT_DISABLED = "true"; });

function makeApp(path: string, limit: number) {
  const app = new Hono();
  app.get(path, rateLimit(limit), (c) => c.json({ ok: true }));
  return app;
}

async function hit(app: Hono, path: string, times: number): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < times; i++) {
    const res = await app.request(path, { method: "GET" });
    statuses.push(res.status);
  }
  return statuses;
}

test("rate-limit: allows requests under the limit", async () => {
  const app = makeApp("/under", 5);
  const statuses = await hit(app, "/under", 5);
  assert.ok(statuses.every((s) => s === 200));
});

test("rate-limit: returns 429 once limit is exceeded", async () => {
  const app = makeApp("/exceed", 3);
  const statuses = await hit(app, "/exceed", 5);
  assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
});

test("rate-limit: 429 response includes Retry-After header", async () => {
  const app = makeApp("/retry-after", 1);
  await app.request("/retry-after"); // consume the slot
  const res = await app.request("/retry-after");
  assert.equal(res.status, 429);
  assert.ok(res.headers.get("retry-after"));
});

test("rate-limit: 429 response has error message", async () => {
  const app = makeApp("/error-msg", 1);
  await app.request("/error-msg");
  const res = await app.request("/error-msg");
  const body = await res.json() as { error: string };
  assert.match(body.error, /too many requests/i);
});

test("rate-limit: different paths have independent buckets", async () => {
  const app = new Hono();
  app.get("/path-a", rateLimit(2), (c) => c.json({ ok: true }));
  app.get("/path-b", rateLimit(2), (c) => c.json({ ok: true }));

  await hit(app, "/path-a", 2); // exhaust /path-a
  const res = await app.request("/path-b"); // /path-b should still work
  assert.equal(res.status, 200);
});

test("globalRateLimit: counts across all paths", async () => {
  const app = new Hono();
  app.use("*", globalRateLimit(2));
  app.get("/g1", (c) => c.json({ ok: true }));
  app.get("/g2", (c) => c.json({ ok: true }));

  await app.request("/g1");
  await app.request("/g2"); // 2nd request, different path but same IP bucket
  const res = await app.request("/g1"); // 3rd request — over global limit
  assert.equal(res.status, 429);
});
