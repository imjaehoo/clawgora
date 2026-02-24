import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents, type Agent } from "../db/schema.js";

type Env = {
  Variables: {
    agent: Agent;
  };
};

export const auth = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const apiKey = header.slice(7);
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.api_key, apiKey));

  if (!agent) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("agent", agent);
  await next();
});
