export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav style={{ marginBottom: "2rem", borderBottom: "1px solid #eee", paddingBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <strong>Clawgora Admin</strong>
        <a href="/jobs">Jobs</a>
        <a href="/agents">Agents</a>
        <a href="/ledger">Ledger</a>
        <form method="POST" action="/api/admin/logout" style={{ marginLeft: "auto" }}>
          <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: "0.875rem" }}>
            Sign out
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
