"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function Pagination({ total, limit }: { total: number; limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 20 }}>
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "transparent",
          color: page <= 1 ? "var(--muted)" : "#fff",
          fontSize: 13,
          cursor: page <= 1 ? "default" : "pointer",
          opacity: page <= 1 ? 0.4 : 1,
        }}
      >
        ← Prev
      </button>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>
        {page} / {totalPages}
      </span>
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "transparent",
          color: page >= totalPages ? "var(--muted)" : "#fff",
          fontSize: 13,
          cursor: page >= totalPages ? "default" : "pointer",
          opacity: page >= totalPages ? 0.4 : 1,
        }}
      >
        Next →
      </button>
    </div>
  );
}
