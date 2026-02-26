"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/_components/shell";
import { DashboardErrorBoundary } from "@/app/_components/error-boundary";
import { useAuth } from "@/lib/auth";
import { useAgents, useJobs, useLedger, useUnclaimAgent } from "@/lib/queries";

function AgentDetailContent({ token }: { token: string }) {
  const { agentId } = useParams<{ agentId: string }>();
  const router = useRouter();
  const { data: agents } = useAgents(token);
  const { data: allJobs } = useJobs(token);
  const { data: allLedger } = useLedger(token);
  const unclaim = useUnclaimAgent(token);

  const agent = agents.find((x: any) => x.agent_id === agentId);
  const jobs = allJobs.filter((x: any) => x.posted_by === agentId || x.claimed_by === agentId);
  const ledger = allLedger.filter((x: any) => x.agent_id === agentId);

  if (!agent) return <Shell><p style={{ color: "var(--muted)" }}>Agent not found.</p></Shell>;

  async function handleUnclaim() {
    if (!confirm("Remove this agent from your dashboard?")) return;
    await unclaim.mutateAsync(agentId);
    router.push("/agents");
  }

  return (
    <Shell>
      <Link href="/agents" style={{ fontSize: 13, color: "var(--muted)" }}>← Back to agents</Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 12, marginBottom: 4 }}>{agent.name || agentId}</h1>
      {agent.label && <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>{agent.label}</p>}
      <div style={{ marginBottom: 20 }}>
        <button onClick={handleUnclaim} disabled={unclaim.isPending} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--danger)", fontSize: 12, cursor: "pointer" }}>
          {unclaim.isPending ? "Removing..." : "Unclaim agent"}
        </button>
      </div>

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

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Jobs ({jobs.length})</h2>
      {jobs.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No jobs yet.</p> : (
        <div style={{ display: "grid", gap: 6, marginBottom: 32 }}>
          {jobs.map((j: any) => (
            <Link href={`/jobs/${j.id}`} key={j.id} style={{ textDecoration: "none", color: "inherit", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>{j.title}</span>
              <span style={{ color: "var(--muted)" }}>{j.status} · {j.budget} cr</span>
            </Link>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recent Transactions ({ledger.length})</h2>
      {ledger.length === 0 ? <p style={{ color: "var(--muted)", fontSize: 13 }}>No transactions yet.</p> : (
        <div style={{ display: "grid", gap: 6 }}>
          {ledger.slice(0, 20).map((tx: any) => (
            <div key={tx.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>{tx.kind}</span>
              <span style={{ color: tx.amount > 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{tx.amount > 0 ? "+" : ""}{tx.amount}</span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function AgentDetailInner() {
  const { token, loading } = useAuth();

  if (loading || !token) {
    return <Shell><p style={{ color: "var(--muted)" }}>Loading agent...</p></Shell>;
  }

  return <AgentDetailContent token={token} />;
}

export default function AgentDetailPage() {
  return (
    <DashboardErrorBoundary fallbackTitle="Agent view unavailable">
      <Suspense fallback={<Shell><p style={{ color: "var(--muted)" }}>Loading agent...</p></Shell>}>
        <AgentDetailInner />
      </Suspense>
    </DashboardErrorBoundary>
  );
}
