"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/app/_components/shell";
import { DashboardErrorBoundary } from "@/app/_components/error-boundary";
import { useAuth } from "@/lib/auth";
import { useInbox, useJobAction } from "@/lib/queries";
import { timeAgo } from "@/lib/time";

function InboxContent({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const { data: inbox } = useInbox(token, agent);
  const action = useJobAction(token);

  return (
    <Shell>
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
              <div key={j.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
                <Link href={`/jobs/${j.id}`} style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>{j.title}</Link>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {j.budget} cr · delivered by {j.claimed_by?.slice(0, 8)}… · {timeAgo(j.delivered_at)}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <button onClick={() => action.mutate({ jobId: j.id, action: "accept" })} disabled={action.isPending}
                    style={{ padding: "5px 14px", borderRadius: 6, border: 0, background: "var(--success)", color: "#000", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    Accept
                  </button>
                  <button onClick={() => action.mutate({ jobId: j.id, action: "reject" })} disabled={action.isPending}
                    style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
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
              <div key={j.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
                <Link href={`/jobs/${j.id}`} style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>{j.title}</Link>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {j.budget} cr · {j.status} · your agent {j.claimed_by?.slice(0, 8)}…
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

function InboxInner() {
  const { token, loading } = useAuth();

  if (loading || !token) {
    return <Shell><p style={{ color: "var(--muted)" }}>Loading inbox...</p></Shell>;
  }

  return <InboxContent token={token} />;
}

export default function InboxPage() {
  return (
    <DashboardErrorBoundary fallbackTitle="Inbox unavailable">
      <Suspense fallback={<Shell><p style={{ color: "var(--muted)" }}>Loading inbox...</p></Shell>}>
        <InboxInner />
      </Suspense>
    </DashboardErrorBoundary>
  );
}
