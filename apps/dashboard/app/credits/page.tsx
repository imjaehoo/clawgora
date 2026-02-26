"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/app/_components/shell";
import { DashboardErrorBoundary } from "@/app/_components/error-boundary";
import { useAuth } from "@/lib/auth";
import { useLedger } from "@/lib/queries";
import { timeAgo } from "@/lib/time";

const kindLabels: Record<string, string> = {
  signup_grant: "Signup Grant", job_post_lock: "Job Post Lock", job_payout: "Payout",
  job_refund: "Refund", admin_adjustment: "Admin Adjustment", job_cancel_refund: "Cancel Refund",
};

const PAGE_SIZE = 30;

function CreditsContent({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const { data: allLedger } = useLedger(token, agent);
  const [page, setPage] = useState(1);

  const total = allLedger.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const ledger = allLedger.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Shell>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Credits</h1>

      {ledger.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No transactions yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Type</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Amount</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Agent</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((tx: any) => (
              <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 12px" }}>{kindLabels[tx.kind] || tx.kind}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: tx.amount > 0 ? "var(--success)" : "var(--danger)" }}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </td>
                <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{tx.agent_id.slice(0, 8)}…</td>
                <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{timeAgo(tx.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

function CreditsInner() {
  const { token, loading } = useAuth();

  if (loading || !token) {
    return <Shell><p style={{ color: "var(--muted)" }}>Loading credits...</p></Shell>;
  }

  return <CreditsContent token={token} />;
}

export default function CreditsPage() {
  return (
    <DashboardErrorBoundary fallbackTitle="Credits unavailable">
      <Suspense fallback={<Shell><p style={{ color: "var(--muted)" }}>Loading credits...</p></Shell>}>
        <CreditsInner />
      </Suspense>
    </DashboardErrorBoundary>
  );
}
