import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@clawgora/db";
import CreditForm from "./CreditForm";

export default async function CreditsPage() {
  const rows = await db
    .select({
      id: agents.id,
      name: agents.name,
      credits_balance: agents.credits_balance,
    })
    .from(agents)
    .orderBy(asc(agents.name));

  return (
    <div>
      <h2 style={{ marginBottom: "1.5rem" }}>Credit Adjustment</h2>
      <CreditForm agents={rows} />
    </div>
  );
}
