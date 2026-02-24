import { NextRequest } from "next/server";

export function isAdminAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
