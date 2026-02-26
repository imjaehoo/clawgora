"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useAgents, useInbox } from "@/lib/queries";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const topNav = [
  { href: "/overview", label: "Overview" },
  { href: "/agents", label: "Agents" },
];

const bottomNav = [
  { href: "/jobs", label: "Jobs" },
  { href: "/credits", label: "Credits" },
  { href: "/inbox", label: "Inbox", hasBadge: true },
];

type AgentOption = { agent_id: string; name: string | null; label: string | null };

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, padding: "24px 16px", borderRight: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 24, padding: "0 8px" }}>
          <span style={{ color: "var(--accent-light)" }}>⬡</span> Clawgora
        </div>

        <Suspense fallback={<NavFallback />}>
          {token ? <NavWithData token={token} /> : <NavFallback />}
        </Suspense>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: "0 12px", fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          <LogoutButton />
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
}

function NavFallback() {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {[...topNav, ...bottomNav].map(({ href, label }) => (
        <div key={href} style={{ padding: "8px 12px", fontSize: 14, color: "#888" }}>{label}</div>
      ))}
    </nav>
  );
}

function NavWithData({ token }: { token: string }) {
  const { data: agents = [] } = useAgents(token);
  const { data: inbox } = useInbox(token);
  const inboxCount = inbox?.pending_review?.length || 0;

  return (
    <Suspense>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {topNav.map(({ href, label }) => <NavItem key={href} href={href} label={label} />)}

        {agents.length > 1 && (
          <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
            <AgentSwitcher agents={agents} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: agents.length > 1 ? 4 : 12 }}>
          {bottomNav.map(({ href, label, hasBadge }) => (
            <NavItem key={href} href={href} label={label} badgeCount={hasBadge ? inboxCount : undefined} />
          ))}
        </div>
      </nav>
    </Suspense>
  );
}

function NavItem({ href, label, badgeCount }: { href: string; label: string; badgeCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const active = pathname.startsWith(href);
  const fullHref = agent ? `${href}?agent=${agent}` : href;

  return (
    <Link href={fullHref} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", borderRadius: 6, fontSize: 14,
      color: active ? "#fff" : "#888",
      background: active ? "var(--accent)22" : "transparent",
      fontWeight: active ? 600 : 400, textDecoration: "none",
    }}>
      {label}
      {!!badgeCount && badgeCount > 0 && (
        <span style={{ background: "var(--danger)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center" }}>
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

function AgentSwitcher({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("agent") || "";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("agent", val); else params.delete("agent");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", padding: "0 8px", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agent</div>
      <div style={{ position: "relative" }}>
        <select value={current} onChange={onChange} style={{
          width: "100%", padding: "7px 32px 7px 10px", borderRadius: 6,
          border: "1px solid var(--border)", background: "var(--bg)",
          color: "#fff", fontSize: 13, cursor: "pointer", appearance: "none", WebkitAppearance: "none",
        }}>
          <option value="">All agents</option>
          {agents.map((a: AgentOption) => (
            <option key={a.agent_id} value={a.agent_id}>{a.name || a.agent_id.slice(0, 8) + "…"}{a.label ? ` · ${a.label}` : ""}</option>
          ))}
        </select>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  }
  return (
    <button onClick={handleLogout} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 12, padding: "6px 12px", borderRadius: 6, cursor: "pointer", width: "100%" }}>
      Sign out
    </button>
  );
}
