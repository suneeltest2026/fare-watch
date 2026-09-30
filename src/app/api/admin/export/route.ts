import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { adminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  const db = adminClient();
  const { data, error } = await db
    .from("fare_checks")
    .select("check_date, route, season, trip_type, departure_date, return_date, status, price_aed, airline, stops, duration_min")
    .order("check_date", { ascending: true })
    .order("departure_date", { ascending: true })
    .limit(20000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ["check_date", "route", "season", "trip_type", "departure_date", "return_date", "status", "price_aed", "airline", "stops", "duration_min"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.join(","), ...(data || []).map((r: Record<string, unknown>) => header.map((h) => esc(r[h])).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fare-watch-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
