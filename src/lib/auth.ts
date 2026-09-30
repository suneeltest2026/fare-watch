import { NextRequest } from "next/server";

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically. */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export function isAdminAuthorized(req: NextRequest): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return req.headers.get("x-admin-password") === pw;
}
