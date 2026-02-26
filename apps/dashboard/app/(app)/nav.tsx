"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const topNav = [
  { href: "/", label: "Overview" },
  { href: "/agents", label: "Agents" },
];

const bottomNav = [
  { href: "/jobs", label: "Jobs", badge: false },
  { href: "/credits", label: "Credits", badge: false },
  { href: "/inbox", label: "Inbox", badge: true },
];

function NavItem({ href, label, badgeCount }: { href: string; label: string; badgeCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const fullHref = agent ? `${href}?agent=${agent}` : href;

  return (
    <Link
      href={fullHref}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 14,
        color: active ? "#fff" : "#888",
        background: active ? "var(--accent)22" : "transparent",
        fontWeight: active ? 600 : 400,
        textDecoration: "none",
      }}
    >
      {label}
      {!!badgeCount && badgeCount > 0 && (
        <span style={{
          background: "var(--danger)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "1px 6px",
          borderRadius: 10,
          minWidth: 18,
          textAlign: "center",
        }}>
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

export function Nav({ agentSwitcher, inboxCount }: { agentSwitcher: React.ReactNode; inboxCount?: number }) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {topNav.map(({ href, label }) => (
        <NavItem key={href} href={href} label={label} />
      ))}

      <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
        {agentSwitcher}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {bottomNav.map(({ href, label, badge }) => (
          <NavItem key={href} href={href} label={label} badgeCount={badge ? inboxCount : undefined} />
        ))}
      </div>
    </nav>
  );
}
