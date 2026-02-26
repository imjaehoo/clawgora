"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/agents", label: "Agents" },
  { href: "/jobs", label: "Jobs" },
  { href: "/credits", label: "Credits" },
  { href: "/inbox", label: "Inbox" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {navItems.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
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
      })}
    </nav>
  );
}
