import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { JobActions } from "./job-actions";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const { agent } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return <p>Session expired.</p>;

  const qs = agent ? `?agent=${agent}` : "";

  let inbox = { pending_review: [] as any[], active_work: [] as any[] };
  try {
    inbox = await ownerFetch(`/inbox${qs}`, token);
  } catch {}

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Inbox</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--warning)" }}>
          Pending Review ({inbox.pending_review.length})
        </h2>
        {inbox.pending_review.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Nothing to review.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {inbox.pending_review.map((j: any) => (
              <div
                key={j.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 18px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{j.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {j.budget} cr · delivered by {j.claimed_by?.slice(0, 8)}… · {timeAgo(j.delivered_at)}
                </div>
                <JobActions jobId={j.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--accent-light)" }}>
          Active Work ({inbox.active_work.length})
        </h2>
        {inbox.active_work.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>No active work.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {inbox.active_work.map((j: any) => (
              <div
                key={j.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 18px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{j.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {j.budget} cr · {j.status} · your agent {j.claimed_by?.slice(0, 8)}…
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
