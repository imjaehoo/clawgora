"use client";

import { Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { fetchAgents } from "@/lib/admin-api";

type FormValues = { agent_id: string; amount: string; reason: string };
type CreditResponse = { ok?: boolean; credits_balance?: number; error?: string };

async function applyCredit(input: FormValues): Promise<CreditResponse> {
  const amountMinor = Math.round(parseFloat(input.amount) * 100);
  if (isNaN(amountMinor) || amountMinor === 0) throw new Error("Amount must be a non-zero number.");

  const res = await fetch("/api/admin/credits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agent_id: input.agent_id, amount_minor: amountMinor, reason: input.reason }),
  });

  const body = (await res.json()) as CreditResponse;
  if (!res.ok) throw new Error(body.error ?? "Unknown error.");
  return body;
}

function CreditFormInner() {
  const qc = useQueryClient();
  const { data: agents } = useSuspenseQuery({ queryKey: ["admin", "agents"], queryFn: fetchAgents });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ defaultValues: { agent_id: "", amount: "", reason: "" } });

  const mutation = useMutation({
    mutationFn: applyCredit,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      reset({ agent_id: "", amount: "", reason: "" });
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Agent</label>
        <select {...register("agent_id", { required: "Agent is required." })} style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: 4 }}>
          <option value="">— select agent —</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name ?? "(unnamed)"} — {(a.credits_balance / 100).toFixed(2)} cr — {a.id.slice(0, 8)}</option>)}
        </select>
        {errors.agent_id && <p style={{ color: "#c00", margin: "4px 0 0" }}>{errors.agent_id.message}</p>}
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Amount (credits) — negative to deduct</label>
        <input type="number" step="0.01" placeholder="e.g. 50 or -10" {...register("amount", { required: "Amount is required.", validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) !== 0) || "Amount must be a non-zero number." })} style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: 4, boxSizing: "border-box" }} />
        {errors.amount && <p style={{ color: "#c00", margin: "4px 0 0" }}>{errors.amount.message}</p>}
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Reason</label>
        <input type="text" placeholder="e.g. Manual top-up for testing" {...register("reason", { required: "Reason is required." })} style={{ width: "100%", padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: 4, boxSizing: "border-box" }} />
        {errors.reason && <p style={{ color: "#c00", margin: "4px 0 0" }}>{errors.reason.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting || mutation.isPending} style={{ padding: "0.6rem 1.2rem", fontSize: "1rem", background: isSubmitting || mutation.isPending ? "#999" : "#111", color: "#fff", border: "none", borderRadius: 4, cursor: isSubmitting || mutation.isPending ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
        {mutation.isPending ? "Applying…" : "Apply adjustment"}
      </button>

      {mutation.isSuccess && <p style={{ color: "#080", margin: 0, fontSize: "0.9rem" }}>Done. New balance: {((mutation.data.credits_balance ?? 0) / 100).toFixed(2)} credits.</p>}
      {mutation.isError && <p style={{ color: "#c00", margin: 0, fontSize: "0.9rem" }}>{mutation.error instanceof Error ? mutation.error.message : "Request failed."}</p>}
    </form>
  );
}

export default function CreditForm() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <p>Loading form…</p>;

  return (
    <Suspense fallback={<p>Loading form…</p>}>
      <CreditFormInner />
    </Suspense>
  );
}
