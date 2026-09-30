import { adminClient } from "@/lib/supabase";
import { searchCheapest, FareResult } from "@/lib/serpapi";
import { allSearchJobs, SearchJob } from "@/config/trips";

const BATCH_SIZE = 7;
const MAX_RETRIES = 2;

function monthStart(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function searchesUsedThisMonth(): Promise<number> {
  const db = adminClient();
  const { data, error } = await db.from("runs").select("searches_used").gte("started_at", monthStart());
  if (error) throw error;
  return (data || []).reduce((s, r) => s + (r.searches_used || 0), 0);
}

async function searchWithRetry(job: SearchJob): Promise<{ result: FareResult; used: number }> {
  let used = 0;
  let result: FareResult = { status: "error", priceAed: null, airline: null, stops: null, durationMin: null, priceInsights: null };
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    used++;
    try {
      result = await searchCheapest(job);
    } catch (e) {
      result = { ...result, status: "error", error: String(e) };
    }
    if (result.status !== "error") break;
  }
  return { result, used };
}

/**
 * Runs searches and saves results.
 * kind: "weekly" (all trips), "retry" (only given jobs), "manual" (all trips)
 */
export async function runCollection(kind: "weekly" | "retry" | "manual", jobs: SearchJob[] = allSearchJobs()) {
  const db = adminClient();
  const cap = Number(process.env.MONTHLY_SEARCH_CAP || 200);
  const usedSoFar = await searchesUsedThisMonth();
  // Worst case each job uses 1 + MAX_RETRIES searches; normally 1.
  if (usedSoFar + jobs.length > cap) {
    await db.from("runs").insert({
      kind,
      finished_at: new Date().toISOString(),
      searches_used: 0,
      ok_count: 0,
      error_count: 0,
      notes: `Skipped: monthly cap ${cap} would be exceeded (used ${usedSoFar}).`,
    });
    return { skipped: true, usedSoFar, cap };
  }

  const { data: run, error: runErr } = await db.from("runs").insert({ kind }).select("id").single();
  if (runErr) throw runErr;

  const checkDate = new Date().toISOString().slice(0, 10);
  let searchesUsed = 0, ok = 0, errors = 0, notAvailable = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((j) => searchWithRetry(j)));
    const rows = results.map(({ result, used }, idx) => {
      const job = batch[idx];
      searchesUsed += used;
      if (result.status === "ok") ok++;
      else if (result.status === "not_available") notAvailable++;
      else errors++;
      return {
        run_id: run.id,
        check_date: checkDate,
        route: job.route.id,
        season: job.season,
        trip_type: job.tripType,
        departure_date: job.departureDate,
        return_date: job.returnDate,
        status: result.status,
        price_aed: result.priceAed,
        airline: result.airline,
        stops: result.stops,
        duration_min: result.durationMin,
        price_insights: result.priceInsights,
        error: result.error ?? null,
      };
    });
    const { error } = await db.from("fare_checks").insert(rows);
    if (error) throw error;
  }

  await db
    .from("runs")
    .update({
      finished_at: new Date().toISOString(),
      searches_used: searchesUsed,
      ok_count: ok,
      error_count: errors,
      notes: `not available yet: ${notAvailable}`,
    })
    .eq("id", run.id);

  return { skipped: false, runId: run.id, searchesUsed, ok, errors, notAvailable };
}

/** Finds trips that failed in the most recent run of the last 6 days and have no later success. */
export async function failedJobsFromLatestRun(): Promise<SearchJob[]> {
  const db = adminClient();
  const since = new Date(Date.now() - 6 * 86400000).toISOString();
  const { data: runs } = await db
    .from("runs")
    .select("id")
    .in("kind", ["weekly", "manual", "retry"])
    .gte("started_at", since)
    .order("started_at", { ascending: false });
  if (!runs || runs.length === 0) return [];
  const runIds = runs.map((r) => r.id);

  const { data: checks } = await db
    .from("fare_checks")
    .select("route, season, trip_type, departure_date, status, created_at")
    .in("run_id", runIds)
    .order("created_at", { ascending: false });
  if (!checks) return [];

  // Latest status per trip
  const latest = new Map<string, string>();
  for (const c of checks) {
    const k = `${c.route}|${c.season}|${c.trip_type}|${c.departure_date}`;
    if (!latest.has(k)) latest.set(k, c.status);
  }
  const failedKeys = new Set(Array.from(latest.entries()).filter(([, s]) => s === "error").map(([k]) => k));
  return allSearchJobs().filter((j) => failedKeys.has(`${j.route.id}|${j.season}|${j.tripType}|${j.departureDate}`));
}
