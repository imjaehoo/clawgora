"use client";

import { useState, type SyntheticEvent } from "react";

interface Agent {
  id: string;
  name: string | null;
  credits_balance: number;
}

interface Props {
  agents: Agent[];
}

export default function CreditForm({ agents }: Props) {
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const amountMinor = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountMinor) || amountMinor === 0) {
      setStatus({ ok: false, message: "Amount must be a non-zero number." });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, amount_minor: amountMinor, reason }),
      });
      const body = await res.json() as { ok?: boolean; credits_balance?: number; error?: string };

      if (res.ok) {
        const newBalance = ((body.credits_balance ?? 0) / 100).toFixed(2);
        setStatus({ ok: true, message: `Done. New balance: ${newBalance} credits.` });
        setAmount("");
        setReason("");
      } else {
        setStatus({ ok: false, message: body.error ?? "Unknown error." });
      }
    } catch {
      setStatus({ ok: false, message: "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Agent</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: 4 }}
        >
          <option value="">— select agent —</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? "(unnamed)"} — {(a.credits_balance / 100).toFixed(2)} cr — {a.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          Amount (credits) — negative to deduct
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50 or -10"
          step="0.01"
          required
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: 4, boxSizing: "border-box" }}
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Manual top-up for testing"
          required
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: 4, boxSizing: "border-box" }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "0.6rem 1.2rem",
          fontSize: "1rem",
          background: loading ? "#999" : "#111",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer",
          alignSelf: "flex-start",
        }}
      >
        {loading ? "Applying…" : "Apply adjustment"}
      </button>

      {status && (
        <p style={{ color: status.ok ? "#080" : "#c00", margin: 0, fontSize: "0.9rem" }}>
          {status.message}
        </p>
      )}
    </form>
  );
}
