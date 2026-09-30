import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/auth";
import { adminClient } from "@/lib/supabase";
import { searchesUsedThisMonth } from "@/lib/collector";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  try {
    const db = adminClient();
    const { data: runs, error } = await db.from("runs").select("*").order("started_at", { ascending: false }).limit(30);
    if (error) throw error;
    const used = await searchesUsedThisMonth();
    return NextResponse.json({ runs, searchesUsedThisMonth: used, cap: Number(process.env.MONTHLY_SEARCH_CAP || 200) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
