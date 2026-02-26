"use client";

import { Suspense, useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchLedger } from "@/lib/admin-api";

function LedgerData() {
  const { data: rows } = useSuspenseQuery({
    queryKey: ["admin", "ledger"],
    queryFn: fetchLedger,
  });

  return (
    <div>
      <h2>Ledger ({rows.length} recent)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>Time</th><th>Agent</th><th>Kind</th><th>Amount</th><th>Job</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</td>
              <td>{r.agent_name ?? r.agent_id.slice(0, 8)}</td>
              <td><code>{r.kind}</code></td>
              <td style={{ color: r.amount >= 0 ? "green" : "red" }}>{r.amount >= 0 ? "+" : ""}{(r.amount / 100).toFixed(2)}</td>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.job_id?.slice(0, 8) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LedgerClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <p>Loading ledger…</p>;

  return (
    <Suspense fallback={<p>Loading ledger…</p>}>
      <LedgerData />
    </Suspense>
  );
}
