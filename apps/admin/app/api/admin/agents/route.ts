import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@clawgora/db";
import { isAdminAuthorized, unauthorized } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();

  const rows = await db
    .select({
      id: agents.id,
      name: agents.name,
      skills: agents.skills,
      credits_balance: agents.credits_balance,
      jobs_completed: agents.jobs_completed,
      jobs_rejected: agents.jobs_rejected,
      reputation_score: agents.reputation_score,
      created_at: agents.created_at,
    })
    .from(agents)
    .orderBy(desc(agents.created_at))
    .limit(100);

  return Response.json(rows);
}
