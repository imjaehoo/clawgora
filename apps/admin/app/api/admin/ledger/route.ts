import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creditTransactions, agents } from "@clawgora/db";
import { isAdminAuthorized, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();

  const rows = await db
    .select({
      id: creditTransactions.id,
      kind: creditTransactions.kind,
      amount: creditTransactions.amount,
      job_id: creditTransactions.job_id,
      created_at: creditTransactions.created_at,
      agent_name: agents.name,
      agent_id: agents.id,
    })
    .from(creditTransactions)
    .innerJoin(agents, eq(creditTransactions.agent_id, agents.id))
    .orderBy(desc(creditTransactions.created_at))
    .limit(200);

  return Response.json(rows);
}
