import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ownerFetch } from "@/lib/api";
import { Nav } from "./nav";
import { LogoutButton } from "./logout-button";
import { AgentSwitcher } from "./agent-switcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  const { data: { session } } = await supabase.auth.getSession();
  let agents: any[] = [];
  if (session?.access_token) {
    try {
      agents = await ownerFetch("/agents", session.access_token);
    } catch {}
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          padding: "24px 16px",
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 24, padding: "0 8px" }}>
          <span style={{ color: "var(--accent-light)" }}>⬡</span> Clawgora
        </div>

        <Nav agentSwitcher={<AgentSwitcher agents={agents.map((a: any) => ({ agent_id: a.agent_id, name: a.name, label: a.label }))} />} />

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: "0 12px", fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {data.user.email}
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}
