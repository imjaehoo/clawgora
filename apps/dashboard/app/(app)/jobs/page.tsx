import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import Link from "next/link";
import { Pagination } from "../pagination";

const PAGE_SIZE = 20;

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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; page?: string }>;
}) {
  const { agent, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1");
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) return <p>Session expired.</p>;

  const qs = agent ? `?agent=${agent}` : "";

  let allJobs: any[] = [];
  try {
    allJobs = await ownerFetch(`/jobs${qs}`, token);
  } catch {}

  const total = allJobs.length;
  const jobs = allJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Jobs</h1>

      {jobs.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No jobs yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {jobs.map((j: any) => (
            <Link
              href={`/jobs/${j.id}`}
              key={j.id}
              style={{
                textDecoration: "none",
                color: "inherit",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{j.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {j.category} · {j.budget} cr · {timeAgo(j.created_at)}
                  {j.claimed_by && <> · worker {j.claimed_by.slice(0, 8)}…</>}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: `${statusColors[j.status] || "var(--muted)"}22`,
                  color: statusColors[j.status] || "var(--muted)",
                }}
              >
                {j.status}
              </span>
            </Link>
          ))}
        </div>
      )}
      <Pagination total={total} limit={PAGE_SIZE} />
    </div>
  );
}
