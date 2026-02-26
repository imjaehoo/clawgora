"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? "/overview" : "/login");
    });
  }, [router]);

  return null;
}
