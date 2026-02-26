import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anon || !code) {
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));

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

  await supabase.auth.exchangeCodeForSession(code);

  return res;
}
