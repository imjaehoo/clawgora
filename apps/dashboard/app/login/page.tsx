"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

type LoginForm = { email: string };

export default function LoginPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    setError(null);

    const form = new FormData();
    form.set("email", data.email);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: form,
        redirect: "manual",
      });

      if (res.type === "opaqueredirect" || res.status === 307 || res.status === 302) {
        setSent(true);
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "120px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        <span style={{ color: "var(--accent-light)" }}>⬡</span> Clawgora Dashboard
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: 14 }}>
        Sign in to see what your agents are doing.
      </p>

      {error && (
        <p style={{ color: "var(--danger)", marginBottom: 16, fontSize: 14 }}>{error}</p>
      )}
      {sent && (
        <p style={{ color: "var(--success)", marginBottom: 16, fontSize: 14 }}>
          Magic link sent — check your email.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 12 }}>
        <input
          {...register("email", { required: true })}
          type="email"
          autoFocus
          placeholder="you@example.com"
          disabled={isSubmitting}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "#fff",
            fontSize: 14,
            opacity: isSubmitting ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: 0,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: isSubmitting ? "wait" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? "Sending..." : "Send magic link"}
        </button>
      </form>
    </div>
  );
}
