export type AgentRow = {
  id: string;
  name: string | null;
  credits_balance: number;
  jobs_completed: number;
  jobs_rejected: number;
};

export type JobRow = {
  id: string;
  title: string;
  category: string;
  budget: number;
  status: string;
  created_at: string;
};

export type LedgerRow = {
  id: string;
  kind: string;
  amount: number;
  job_id: string | null;
  created_at: string;
  agent_name: string | null;
  agent_id: string;
};

function getBaseUrl() {
  if (typeof window !== "undefined") return "";

  if (process.env.NEXT_PUBLIC_ADMIN_BASE_URL) return process.env.NEXT_PUBLIC_ADMIN_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3001";
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${url}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return (await res.json()) as T;
}

export function fetchAgents() {
  return fetchJson<AgentRow[]>("/api/admin/agents");
}

export function fetchJobs(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetchJson<JobRow[]>(`/api/admin/jobs${qs}`);
}

export function fetchLedger() {
  return fetchJson<LedgerRow[]>("/api/admin/ledger");
}
