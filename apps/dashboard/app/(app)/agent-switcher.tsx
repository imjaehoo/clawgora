"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Agent = {
  agent_id: string;
  name: string | null;
  label: string | null;
};

export function AgentSwitcher({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("agent") || "";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("agent", val);
    } else {
      params.delete("agent");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (agents.length <= 1) return null;

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", padding: "0 8px", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Agent
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={current}
          onChange={onChange}
          style={{
            width: "100%",
            padding: "7px 32px 7px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "#fff",
            fontSize: 13,
            cursor: "pointer",
            appearance: "none",
            WebkitAppearance: "none",
          }}
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.agent_id} value={a.agent_id}>
              {a.name || a.agent_id.slice(0, 8) + "…"}
              {a.label ? ` · ${a.label}` : ""}
            </option>
          ))}
        </select>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
