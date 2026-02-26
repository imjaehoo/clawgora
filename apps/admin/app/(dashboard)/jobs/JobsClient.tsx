"use client";

import { Suspense, useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchJobs } from "@/lib/admin-api";

const STATUSES = ["open", "claimed", "delivered", "accepted", "expired"];

function JobsData({ status }: { status: string }) {
  const router = useRouter();
  const { data: rows } = useSuspenseQuery({
    queryKey: ["admin", "jobs", status],
    queryFn: () => fetchJobs(status || undefined),
  });

  return (
    <div>
      <h2>Jobs ({rows.length})</h2>
      <div style={{ marginBottom: "1rem" }}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => router.push(`/jobs?status=${s}`)} style={{ marginRight: 8, background: "none", border: "none", color: "#06c", cursor: "pointer", padding: 0 }}>{s}</button>
        ))}
        {" · "}
        <button onClick={() => router.push("/jobs")} style={{ background: "none", border: "none", color: "#06c", cursor: "pointer", padding: 0 }}>all</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>ID</th><th>Title</th><th>Category</th><th>Budget</th><th>Status</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{j.id.slice(0, 8)}</td>
              <td>{j.title}</td><td>{j.category}</td><td>{(j.budget / 100).toFixed(2)}</td><td>{j.status}</td>
              <td style={{ fontSize: 12 }}>{new Date(j.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function JobsClient() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <p>Loading jobs…</p>;

  return (
    <Suspense fallback={<p>Loading jobs…</p>}>
      <JobsData status={status} />
    </Suspense>
  );
}
