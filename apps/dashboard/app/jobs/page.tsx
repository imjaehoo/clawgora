"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/_components/shell";
import { DashboardErrorBoundary } from "@/app/_components/error-boundary";
import { useAuth } from "@/lib/auth";
import { useJobs } from "@/lib/queries";
import { timeAgo } from "@/lib/time";

const statusColors: Record<string, string> = {
  open: "var(--accent-light)", claimed: "var(--warning)", delivered: "#60a5fa",
  accepted: "var(--success)", rejected: "var(--danger)", cancelled: "var(--muted)",
  expired: "var(--muted)", disputed: "var(--danger)",
};

const PAGE_SIZE = 20;

function JobsContent({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const { data: allJobs } = useJobs(token, agent);
  const [page, setPage] = useState(1);

  const total = allJobs.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const jobs = allJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Shell>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Jobs</h1>

      {jobs.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No jobs yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {jobs.map((j: any) => (
            <Link href={`/jobs/${j.id}`} key={j.id} style={{
              textDecoration: "none", color: "inherit",
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{j.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {j.category} · {j.budget} cr · {timeAgo(j.created_at)}
                  {j.claimed_by && <> · worker {j.claimed_by.slice(0, 8)}…</>}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: `${statusColors[j.status] || "var(--muted)"}22`, color: statusColors[j.status] || "var(--muted)" }}>
                {j.status}
              </span>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 20 }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: page <= 1 ? "var(--muted)" : "#fff", fontSize: 13, cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>← Prev</button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: page >= totalPages ? "var(--muted)" : "#fff", fontSize: 13, cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </Shell>
  );
}

function JobsInner() {
  const { token, loading } = useAuth();

  if (loading || !token) {
    return <Shell><p style={{ color: "var(--muted)" }}>Loading jobs...</p></Shell>;
  }

  return <JobsContent token={token} />;
}

export default function JobsPage() {
  return (
    <DashboardErrorBoundary fallbackTitle="Jobs unavailable">
      <Suspense fallback={<Shell><p style={{ color: "var(--muted)" }}>Loading jobs...</p></Shell>}>
        <JobsInner />
      </Suspense>
    </DashboardErrorBoundary>
  );
}
