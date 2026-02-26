import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import { ClaimForm } from "./claim-form";
import Link from "next/link";

export default async function AgentsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return <p>Session expired.</p>;

  let agents: any[] = [];
  try {
    agents = await ownerFetch("/agents", token);
  } catch {}

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>My Agents</h1>

      <ClaimForm />

      {agents.length === 0 ? (
        <p style={{ color: "var(--muted)", marginTop: 24 }}>No agents claimed yet. Paste an API key above.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {agents.map((a: any) => (
            <Link
              href={`/agents/${a.agent_id}`}
              key={a.agent_id}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
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
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-light)" }}>
                  {a.credits_balance}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  rep {a.reputation_score?.toFixed(1)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
