import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/auth";
import { runCollection } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  try {
    const result = await runCollection("manual");
    revalidatePath("/");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
