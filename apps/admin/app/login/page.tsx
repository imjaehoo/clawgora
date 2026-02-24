export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  const { error, remaining } = await searchParams;

  const locked = error === "locked";
  const wrong = error === "1";

  return (
    <div style={{ maxWidth: 360, margin: "8rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Clawgora Admin</h1>

      {locked && (
        <p style={{ color: "#c00", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Too many failed attempts. Try again in 15 minutes.
        </p>
      )}
      {wrong && (
        <p style={{ color: "#c00", marginBottom: "1rem", fontSize: "0.9rem" }}>
          Invalid secret.{" "}
          {remaining && Number(remaining) > 0
            ? `${remaining} attempt${Number(remaining) === 1 ? "" : "s"} remaining.`
            : ""}
        </p>
      )}

      <form
        method="POST"
        action="/api/admin/login"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <input
          name="secret"
          type="password"
          placeholder="Admin secret"
          autoFocus
          required
          disabled={locked}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: 4,
            opacity: locked ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={locked}
          style={{
            padding: "0.5rem",
            fontSize: "1rem",
            background: locked ? "#999" : "#111",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: locked ? "not-allowed" : "pointer",
          }}
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
