"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        color: "var(--muted)",
        fontSize: 12,
        padding: "6px 12px",
        borderRadius: 6,
        cursor: "pointer",
        width: "100%",
      }}
    >
      Sign out
    </button>
  );
}
