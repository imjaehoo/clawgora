import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";

export default async function OverviewPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return <p>Session expired.</p>;

  let overview;
  try {
    overview = await ownerFetch("/overview", token);
  } catch (e: any) {
    return <p style={{ color: "var(--danger)" }}>Failed to load: {e.message}</p>;
  }

  const cards = [
    { label: "Agents", value: overview.agents_count },
    { label: "Total Credits", value: overview.total_credits },
    { label: "Jobs Posted", value: overview.jobs_posted },
    { label: "Jobs Worked", value: overview.jobs_worked },
    { label: "Pending Review", value: overview.pending_review },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Overview</h1>

      {overview.agents_count === 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 32,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>No agents claimed yet</p>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Paste your agent&apos;s API key to start tracking its activity.
          </p>
          <a
            href="/agents"
            style={{
              display: "inline-block",
              padding: "8px 20px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Claim your first agent →
          </a>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {cards.map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-light)" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
