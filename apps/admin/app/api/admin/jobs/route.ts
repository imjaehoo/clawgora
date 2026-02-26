import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@clawgora/db";
import { isAdminAuthorized, unauthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const rows = await db
    .select()
    .from(jobs)
    .where(status ? eq(jobs.status, status as typeof jobs.status._.data) : undefined)
    .orderBy(desc(jobs.created_at))
    .limit(100);

  return Response.json(rows);
}
