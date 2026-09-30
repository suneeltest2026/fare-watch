import { publicClient } from "@/lib/supabase";
import { ROUTES } from "@/config/trips";
import FareWatch, { FareRow } from "@/components/FareWatch";

export const revalidate = 300; // refresh data at most every 5 minutes

async function loadRows(): Promise<FareRow[]> {
  const db = publicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("fare_checks")
    .select("check_date, route, season, trip_type, departure_date, price_aed, airline, stops")
    .eq("status", "ok")
    .order("check_date", { ascending: true })
    .limit(20000);
  if (error || !data) return [];
  return data.map((r) => ({ ...r, price_aed: Number(r.price_aed) })) as FareRow[];
}

export default async function Home() {
  const rows = await loadRows();
  const routes = ROUTES.map((r) => ({
    id: r.id,
    label: `${r.fromName} → ${r.toName}`,
    seasons: r.seasons.map((s) => ({ key: s.key, label: s.label, labelTe: s.labelTe, firstDeparture: s.departureDates[0], lastDeparture: s.departureDates[s.departureDates.length - 1] })),
  }));
  return <FareWatch rows={rows} routes={routes} />;
}
