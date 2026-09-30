import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isCronAuthorized } from "@/lib/auth";
import { adminClient } from "@/lib/supabase";
import { failedJobsFromLatestRun, runCollection } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily job: (1) keep the free Supabase project active, (2) retry any failed searches from this week.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = adminClient();
    await db.from("runs").select("id").limit(1); // keep-alive read (no SerpApi call)

    const failed = await failedJobsFromLatestRun();
    if (failed.length === 0) return NextResponse.json({ keepAlive: true, retried: 0 });
    const result = await runCollection("retry", failed);
    revalidatePath("/");
    return NextResponse.json({ keepAlive: true, retried: failed.length, result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
