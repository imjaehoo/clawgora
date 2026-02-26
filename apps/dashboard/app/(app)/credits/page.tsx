import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import { Pagination } from "../pagination";

const PAGE_SIZE = 30;

const kindLabels: Record<string, string> = {
  signup_grant: "Signup Grant",
  job_post_lock: "Job Post Lock",
  job_payout: "Payout",
  job_refund: "Refund",
  admin_adjustment: "Admin Adjustment",
  job_cancel_refund: "Cancel Refund",
};

export default async function CreditsPage({
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

  let allLedger: any[] = [];
  try {
    allLedger = await ownerFetch(`/ledger${qs}`, token);
  } catch {}

  const total = allLedger.length;
  const ledger = allLedger.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
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
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 700,
                    color: tx.amount > 0 ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </td>
                <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{tx.agent_id.slice(0, 8)}…</td>
                <td style={{ padding: "8px 12px", color: "var(--muted)" }}>
                  {timeAgo(tx.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination total={total} limit={PAGE_SIZE} />
    </div>
  );
}
