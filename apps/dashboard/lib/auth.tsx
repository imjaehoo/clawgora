"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "./supabase-browser";
import type { User, Session } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  token?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/callback");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setSession(null);
        setUser(null);
        setLoading(false);
        if (!isPublic) router.replace("/login");
        return;
      }

      setSession(session);
      setUser(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSession(null);
        setUser(null);
        if (!isPublic) router.replace("/login");
        return;
      }
      setSession(session);
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [router, isPublic]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, token: session?.access_token }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
