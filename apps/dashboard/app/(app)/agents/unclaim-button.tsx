"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function UnclaimButton({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleUnclaim() {
    if (!confirm("Remove this agent from your dashboard?")) return;
    setLoading(true);

    try {
      const supabase = createSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
      await fetch(`${apiUrl}/owner/agents/${agentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      window.location.href = "/agents";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUnclaim}
      disabled={loading}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--danger)",
        fontSize: 12,
        cursor: loading ? "wait" : "pointer",
      }}
    >
      {loading ? "Removing..." : "Unclaim agent"}
    </button>
  );
}
