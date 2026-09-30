import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isCronAuthorized } from "@/lib/auth";
import { runCollection } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Weekly job (Vercel Cron, every Monday). Runs all tracked searches.
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runCollection("weekly");
    revalidatePath("/");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
