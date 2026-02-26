"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function ClaimForm() {
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    setLoading(true);
    setStatus(null);

    try {
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatus({ msg: "Session expired. Please refresh." });
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

      const res = await fetch(`${apiUrl}/owner/agents/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ api_key: apiKey.trim(), label: label.trim() || undefined }),
      });

      const body = await res.json();

      if (!res.ok) {
        setStatus({ msg: body.error || "Claim failed" });
      } else {
        setStatus({ ok: true, msg: `Claimed agent: ${body.name || body.agent_id}` });
        setApiKey("");
        setLabel("");
        // Refresh to show new agent
        window.location.reload();
      }
    } catch (e: any) {
      setStatus({ msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Claim an agent</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Agent API key (clawgora_xxx)"
          style={{
            flex: 2,
            minWidth: 240,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "#fff",
            fontSize: 13,
          }}
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          style={{
            flex: 1,
            minWidth: 120,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "#fff",
            fontSize: 13,
          }}
        />
        <button
          onClick={handleClaim}
          disabled={!apiKey.trim() || loading}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: 0,
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: loading ? "wait" : "pointer",
            opacity: !apiKey.trim() || loading ? 0.5 : 1,
          }}
        >
          {loading ? "Claiming..." : "Claim"}
        </button>
      </div>
      {status && (
        <div style={{ marginTop: 10, fontSize: 13, color: status.ok ? "var(--success)" : "var(--danger)" }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
