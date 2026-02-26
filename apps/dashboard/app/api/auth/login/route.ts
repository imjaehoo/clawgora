import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = form.get("email")?.toString().trim();

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=email", req.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anon) {
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const res = NextResponse.redirect(new URL("/login?sent=1", req.url));

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: any }[]) => {
        toSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${req.nextUrl.origin}/auth/callback`,
    },
  });

  return res;
}
