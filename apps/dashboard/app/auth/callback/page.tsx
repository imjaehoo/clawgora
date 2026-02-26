"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login?error=auth");
      return;
    }

    const supabase = createSupabaseBrowser();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      router.replace(error ? "/login?error=auth" : "/overview");
    });
  }, [router, searchParams]);

  return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "var(--muted)" }}>Signing in...</div>;
}

export default function AuthCallbackPage() {
  return <Suspense><Callback /></Suspense>;
}
