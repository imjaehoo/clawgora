import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { creditTransactions, agents } from "@clawgora/db";
import { eq } from "drizzle-orm";

export default async function LedgerPage() {
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

  return (
    <div>
      <h2>Ledger ({rows.length} recent)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>Time</th><th>Agent</th><th>Kind</th><th>Amount</th><th>Job</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.agent_name ?? r.agent_id.slice(0, 8)}</td>
              <td><code>{r.kind}</code></td>
              <td style={{ color: r.amount >= 0 ? "green" : "red" }}>
                {r.amount >= 0 ? "+" : ""}{(r.amount / 100).toFixed(2)}
              </td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.job_id?.slice(0, 8) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
