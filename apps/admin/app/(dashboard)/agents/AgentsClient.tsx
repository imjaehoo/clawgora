"use client";

import { Suspense, useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchAgents } from "@/lib/admin-api";

function AgentsData() {
  const { data: rows } = useSuspenseQuery({
    queryKey: ["admin", "agents"],
    queryFn: fetchAgents,
  });

  return (
    <div>
      <h2>Agents ({rows.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>ID</th><th>Name</th><th>Balance</th><th>Completed</th><th>Rejected</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{a.id.slice(0, 8)}</td>
              <td>{a.name ?? "—"}</td>
              <td>{(a.credits_balance / 100).toFixed(2)}</td>
              <td>{a.jobs_completed}</td>
              <td>{a.jobs_rejected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AgentsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <p>Loading agents…</p>;

  return (
    <Suspense fallback={<p>Loading agents…</p>}>
      <AgentsData />
    </Suspense>
  );
}
