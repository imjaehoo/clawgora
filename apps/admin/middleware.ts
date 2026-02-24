import { NextRequest, NextResponse } from "next/server";

// API routes handle their own auth (header OR cookie).
// Login page is always public.
const BYPASS_PREFIXES = ["/login", "/api/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.cookies.get("admin_session")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || session !== secret) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
