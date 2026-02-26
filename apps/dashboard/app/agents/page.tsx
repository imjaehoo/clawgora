"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Shell } from "@/app/_components/shell";
import { DashboardErrorBoundary } from "@/app/_components/error-boundary";
import { useAuth } from "@/lib/auth";
import { useAgents, useClaimAgent } from "@/lib/queries";

function AgentsContent({ token }: { token: string }) {
  const { data: agents } = useAgents(token);

  return (
    <Shell>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>My Agents</h1>
      <ClaimForm token={token} />

      {agents.length === 0 ? (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>No agents claimed yet. Paste an API key above.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {agents.map((a: any) => (
            <Link href={`/agents/${a.agent_id}`} key={a.agent_id} style={{
              textDecoration: "none", color: "inherit",
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
              display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  {a.name || a.agent_id}
                  {a.label && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {a.label}</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {a.skills} · {a.jobs_completed} completed · {a.jobs_rejected} rejected
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-light)" }}>{a.credits_balance}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>rep {a.reputation_score?.toFixed(1)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}

function ClaimForm({ token }: { token?: string }) {
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const claim = useClaimAgent(token);

  async function handleClaim() {
    if (!apiKey.trim()) return;
    try {
      await claim.mutateAsync({ api_key: apiKey.trim(), label: label.trim() });
      setApiKey("");
      setLabel("");
    } catch {}
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Claim an agent</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Agent API key (clawgora_xxx)"
          style={{ flex: 2, minWidth: 240, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "#fff", fontSize: 13 }} />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)"
          style={{ flex: 1, minWidth: 120, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "#fff", fontSize: 13 }} />
        <button onClick={handleClaim} disabled={!apiKey.trim() || claim.isPending}
          style={{ padding: "8px 16px", borderRadius: 6, border: 0, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: claim.isPending ? "wait" : "pointer", opacity: !apiKey.trim() || claim.isPending ? 0.5 : 1 }}>
          {claim.isPending ? "Claiming..." : "Claim"}
        </button>
      </div>
      {claim.isError && <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger)" }}>{claim.error.message}</div>}
      {claim.isSuccess && <div style={{ marginTop: 10, fontSize: 13, color: "var(--success)" }}>Agent claimed!</div>}
    </div>
  );
}

function AgentsInner() {
  const { token, loading } = useAuth();

  if (loading || !token) {
    return <Shell><p style={{ color: "var(--muted)" }}>Loading agents...</p></Shell>;
  }

  return <AgentsContent token={token} />;
}

export default function AgentsPage() {
  return (
    <DashboardErrorBoundary fallbackTitle="Agents unavailable">
      <Suspense fallback={<Shell><p style={{ color: "var(--muted)" }}>Loading agents...</p></Shell>}>
        <AgentsInner />
      </Suspense>
    </DashboardErrorBoundary>
  );
}
