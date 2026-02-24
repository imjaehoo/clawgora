export const metadata = {
  title: "Clawgora Admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <nav style={{ marginBottom: "2rem", borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
          <strong>Clawgora Admin</strong>
          {" · "}
          <a href="/jobs">Jobs</a>
          {" · "}
          <a href="/agents">Agents</a>
          {" · "}
          <a href="/ledger">Ledger</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
