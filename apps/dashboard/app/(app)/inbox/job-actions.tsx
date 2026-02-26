"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function JobActions({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok?: boolean; msg: string } | null>(null);

  async function act(action: "accept" | "reject") {
    setLoading(action);
    setResult(null);

    try {
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setResult({ msg: "Session expired." });
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
      const res = await fetch(`${apiUrl}/owner/jobs/${jobId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const body = await res.json();

      if (!res.ok) {
        setResult({ msg: body.error || `${action} failed` });
      } else {
        setResult({ ok: true, msg: `Job ${action}ed` });
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (e: any) {
      setResult({ msg: e.message });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
      <button
        onClick={() => act("accept")}
        disabled={!!loading}
        style={{
          padding: "5px 14px",
          borderRadius: 6,
          border: 0,
          background: "var(--success)",
          color: "#000",
          fontWeight: 600,
          fontSize: 12,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading === "accept" ? "..." : "Accept"}
      </button>
      <button
        onClick={() => act("reject")}
        disabled={!!loading}
        style={{
          padding: "5px 14px",
          borderRadius: 6,
          border: "1px solid var(--danger)",
          background: "transparent",
          color: "var(--danger)",
          fontWeight: 600,
          fontSize: 12,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading === "reject" ? "..." : "Reject"}
      </button>
      {result && (
        <span style={{ fontSize: 12, color: result.ok ? "var(--success)" : "var(--danger)" }}>
          {result.msg}
        </span>
      )}
    </div>
  );
}
