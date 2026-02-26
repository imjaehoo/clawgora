import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/auth/callback", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anon) {
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }

  const res = NextResponse.next();

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: any }[]) => {
        toSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
