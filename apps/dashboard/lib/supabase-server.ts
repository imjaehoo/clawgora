import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options?: any }[]) => {
        toSet.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options); } catch {}
        });
      },
    },
  });
}
