import { NextRequest } from "next/server";

export function isAdminAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  // Header-based: for API/curl clients
  if (req.headers.get("x-admin-secret") === secret) return true;

  // Cookie-based: for browser clients
  if (req.cookies.get("admin_session")?.value === secret) return true;

  return false;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
