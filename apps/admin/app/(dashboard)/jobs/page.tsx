import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@clawgora/db";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  const rows = await db
    .select()
    .from(jobs)
    .where(status ? eq(jobs.status, status as typeof jobs.status._.data) : undefined)
    .orderBy(desc(jobs.created_at))
    .limit(100);

  return (
    <div>
      <h2>Jobs ({rows.length})</h2>
      <div style={{ marginBottom: "1rem" }}>
        {["open", "claimed", "delivered", "accepted", "expired"].map((s) => (
          <a key={s} href={`?status=${s}`} style={{ marginRight: 8 }}>{s}</a>
        ))}
        {" · "}
        <a href="/jobs">all</a>
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
              <td>{j.title}</td>
              <td>{j.category}</td>
              <td>{(j.budget / 100).toFixed(2)}</td>
              <td>{j.status}</td>
              <td style={{ fontSize: 12 }}>{new Date(j.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
