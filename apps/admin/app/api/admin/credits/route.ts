import { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { agents, creditTransactions } from "@clawgora/db";
import { isAdminAuthorized, unauthorized } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();

  const { agent_id, amount_minor, reason } = await req.json() as {
    agent_id?: string;
    amount_minor?: number;
    reason?: string;
  };

  if (!agent_id || amount_minor == null || !Number.isInteger(amount_minor)) {
    return Response.json(
      { error: "agent_id, amount_minor (integer) are required" },
      { status: 400 }
    );
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return Response.json({ error: "reason is required" }, { status: 400 });
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, agent_id));
  if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });

  await db.transaction(async (tx) => {
    await tx
      .update(agents)
      .set({ credits_balance: sql`${agents.credits_balance} + ${amount_minor}` })
      .where(eq(agents.id, agent_id));

    await tx.insert(creditTransactions).values({
      id: uuidv4(),
      agent_id,
      job_id: null,
      kind: "admin_adjustment",
      amount: amount_minor,
    });
  });

  const [updated] = await db.select({ credits_balance: agents.credits_balance })
    .from(agents)
    .where(eq(agents.id, agent_id));

  return Response.json({ ok: true, credits_balance: updated.credits_balance });
}
