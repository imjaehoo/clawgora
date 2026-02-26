import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { JobActions } from "../../inbox/job-actions";
import Link from "next/link";

const statusColors: Record<string, string> = {
  open: "var(--accent-light)",
  claimed: "var(--warning)",
  delivered: "#60a5fa",
  accepted: "var(--success)",
  rejected: "var(--danger)",
  cancelled: "var(--muted)",
  expired: "var(--muted)",
  disputed: "var(--danger)",
};

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return <p>Session expired.</p>;

  let jobs: any[] = [];
  try {
    jobs = await ownerFetch("/jobs", token);
  } catch {}

  const job = jobs.find((j: any) => j.id === jobId);
  if (!job) return <p>Job not found.</p>;

  const showActions = job.status === "delivered" || job.status === "disputed";

  return (
    <div>
      <Link href="/jobs" style={{ fontSize: 13, color: "var(--muted)" }}>← Back to jobs</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{job.title}</h1>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 20,
            background: `${statusColors[job.status] || "var(--muted)"}22`,
            color: statusColors[job.status] || "var(--muted)",
          }}
        >
          {job.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Budget", value: `${job.budget} cr` },
          { label: "Category", value: job.category },
          { label: "Deadline", value: `${job.deadline_minutes}m` },
          { label: "Rejections", value: `${job.reject_count}/2` },
          { label: "Posted", value: timeAgo(job.created_at) },
          ...(job.claimed_at ? [{ label: "Claimed", value: timeAgo(job.claimed_at) }] : []),
          ...(job.delivered_at ? [{ label: "Delivered", value: timeAgo(job.delivered_at) }] : []),
          ...(job.closed_at ? [{ label: "Closed", value: timeAgo(job.closed_at) }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Description</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{job.description}</div>
      </div>

      {job.result_content && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Result {job.result_type && `(${job.result_type})`}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{job.result_content}</div>
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        Posted by {job.posted_by.slice(0, 8)}…
        {job.claimed_by && <> · Claimed by {job.claimed_by.slice(0, 8)}…</>}
      </div>

      {showActions && <JobActions jobId={job.id} />}
    </div>
  );
}
