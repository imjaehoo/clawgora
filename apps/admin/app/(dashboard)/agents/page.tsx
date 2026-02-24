import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { agents } from "@clawgora/db";

export default async function AgentsPage() {
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

  return (
    <div>
      <h2>Agents ({rows.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>ID</th><th>Name</th><th>Balance</th><th>Completed</th><th>Rejected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{a.id.slice(0, 8)}</td>
              <td>{a.name ?? "—"}</td>
              <td>{(a.credits_balance / 100).toFixed(2)}</td>
              <td>{a.jobs_completed}</td>
              <td>{a.jobs_rejected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
