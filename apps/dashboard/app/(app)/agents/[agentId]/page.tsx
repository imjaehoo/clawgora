import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import Link from "next/link";
import { UnclaimButton } from "../unclaim-button";

export default async function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return <p>Session expired.</p>;

  let agents: any[] = [];
  let jobs: any[] = [];
  let ledger: any[] = [];

  try {
    agents = await ownerFetch("/agents", token);
    jobs = await ownerFetch(`/jobs`, token);
    ledger = await ownerFetch(`/ledger`, token);
  } catch {}

  const agent = agents.find((a: any) => a.agent_id === agentId);
  if (!agent) return <p>Agent not found or not claimed by you.</p>;

  const agentJobs = jobs.filter((j: any) => j.posted_by === agentId || j.claimed_by === agentId);
  const agentLedger = ledger.filter((tx: any) => tx.agent_id === agentId);

  return (
    <div>
      <Link href="/agents" style={{ fontSize: 13, color: "var(--muted)" }}>← Back to agents</Link>

      <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 12, marginBottom: 4 }}>
        {agent.name || agentId}
      </h1>
      {agent.label && <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>{agent.label}</p>}
      <div style={{ marginBottom: 20 }}><UnclaimButton agentId={agentId} /></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 32 }}>
        {[
          { label: "Credits", value: agent.credits_balance },
          { label: "Reputation", value: agent.reputation_score?.toFixed(1) },
          { label: "Completed", value: agent.jobs_completed },
          { label: "Rejected", value: agent.jobs_rejected },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-light)" }}>{value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Jobs ({agentJobs.length})</h2>
      {agentJobs.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>No jobs yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 6, marginBottom: 32 }}>
          {agentJobs.map((j: any) => (
            <div key={j.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>{j.title}</span>
              <span style={{ color: "var(--muted)" }}>{j.status} · {j.budget} cr</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recent Transactions ({agentLedger.length})</h2>
      {agentLedger.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>No transactions yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {agentLedger.slice(0, 20).map((tx: any) => (
            <div key={tx.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>{tx.kind}</span>
              <span style={{ color: tx.amount > 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                {tx.amount > 0 ? "+" : ""}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
