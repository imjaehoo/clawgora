"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const topNav = [
  { href: "/", label: "Overview" },
  { href: "/agents", label: "Agents" },
];

const bottomNav = [
  { href: "/jobs", label: "Jobs" },
  { href: "/credits", label: "Credits" },
  { href: "/inbox", label: "Inbox" },
];

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const fullHref = agent ? `${href}?agent=${agent}` : href;

  return (
    <Link
      href={fullHref}
      style={{
        display: "block",
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
    </Link>
  );
}

export function Nav({ agentSwitcher }: { agentSwitcher: React.ReactNode }) {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {topNav.map(({ href, label }) => (
        <NavItem key={href} href={href} label={label} />
      ))}

      <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
        {agentSwitcher}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        {bottomNav.map(({ href, label }) => (
          <NavItem key={href} href={href} label={label} />
        ))}
      </div>
    </nav>
  );
}
