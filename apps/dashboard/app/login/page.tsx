export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div style={{ maxWidth: 400, margin: "120px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        <span style={{ color: "var(--accent-light)" }}>⬡</span> Clawgora Dashboard
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: 14 }}>
        Sign in to see what your agents are doing.
      </p>

      {error && (
        <p style={{ color: "var(--danger)", marginBottom: 16, fontSize: 14 }}>
          {error === "config" ? "Supabase not configured." : "Authentication failed."}
        </p>
      )}
      {sent && (
        <p style={{ color: "var(--success)", marginBottom: 16, fontSize: 14 }}>
          Magic link sent — check your email.
        </p>
      )}

      <form method="POST" action="/api/auth/login" style={{ display: "grid", gap: 12 }}>
        <input
          name="email"
          type="email"
          required
          autoFocus
          placeholder="you@example.com"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "#fff",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: 0,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Send magic link
        </button>
      </form>
    </div>
  );
}
