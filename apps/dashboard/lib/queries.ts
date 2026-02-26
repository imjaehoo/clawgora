"use client";

import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ownerFetchClient } from "./api-client";

export function useOverview(token: string, agent?: string | null) {
  const qs = agent ? `?agent=${agent}` : "";
  return useSuspenseQuery({
    queryKey: ["overview", agent],
    queryFn: () => ownerFetchClient(`/overview${qs}`, token),
  });
}

export function useAgents(token: string) {
  return useSuspenseQuery({
    queryKey: ["agents"],
    queryFn: () => ownerFetchClient("/agents", token),
  });
}

export function useJobs(token: string, agent?: string | null) {
  const qs = agent ? `?agent=${agent}` : "";
  return useSuspenseQuery({
    queryKey: ["jobs", agent],
    queryFn: () => ownerFetchClient(`/jobs${qs}`, token),
  });
}

export function useLedger(token: string, agent?: string | null) {
  const qs = agent ? `?agent=${agent}` : "";
  return useSuspenseQuery({
    queryKey: ["ledger", agent],
    queryFn: () => ownerFetchClient(`/ledger${qs}`, token),
  });
}

export function useInbox(token: string, agent?: string | null) {
  const qs = agent ? `?agent=${agent}` : "";
  return useSuspenseQuery({
    queryKey: ["inbox", agent],
    queryFn: () => ownerFetchClient(`/inbox${qs}`, token),
  });
}

export function useJobAction(token: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, action }: { jobId: string; action: "accept" | "reject" }) => {
      return ownerFetchClient(`/jobs/${jobId}/${action}`, token!, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export function useClaimAgent(token: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ api_key, label }: { api_key: string; label?: string }) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
      const res = await fetch(`${apiUrl}/owner/agents/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ api_key, label: label || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Claim failed");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useUnclaimAgent(token: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      return ownerFetchClient(`/agents/${agentId}`, token!, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}
