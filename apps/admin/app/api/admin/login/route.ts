import { NextRequest, NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface Tracker {
  attempts: number;
  lockedUntil?: number;
}

const tracker = new Map<string, Tracker>();

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const now = Date.now();
  const entry = tracker.get(ip) ?? { attempts: 0 };

  // Check lockout
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return NextResponse.redirect(new URL("/login?error=locked", req.url));
  }

  // Reset expired lockout
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    entry.attempts = 0;
    entry.lockedUntil = undefined;
  }

  const data = await req.formData();
  const secret = data.get("secret") as string | null;

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    entry.attempts += 1;

    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
      tracker.set(ip, entry);
      return NextResponse.redirect(new URL("/login?error=locked", req.url));
    }

    tracker.set(ip, entry);
    const remaining = MAX_ATTEMPTS - entry.attempts;
    return NextResponse.redirect(
      new URL(`/login?error=1&remaining=${remaining}`, req.url)
    );
  }

  // Success — clear tracker
  tracker.delete(ip);

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("admin_session", secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
