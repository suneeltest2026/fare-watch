import type { SearchJob } from "@/config/trips";

export interface FareResult {
  status: "ok" | "not_available" | "error";
  priceAed: number | null;
  airline: string | null;
  stops: number | null;
  durationMin: number | null;
  priceInsights: unknown;
  error?: string;
}

interface SerpFlightLeg {
  airline?: string;
}
interface SerpOption {
  price?: number;
  total_duration?: number;
  flights?: SerpFlightLeg[];
  layovers?: unknown[];
}

/** One SerpApi Google Flights search. Returns the cheapest option of any kind. */
export async function searchCheapest(job: SearchJob): Promise<FareResult> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return { status: "error", priceAed: null, airline: null, stops: null, durationMin: null, priceInsights: null, error: "SERPAPI_KEY missing" };

  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: job.route.from,
    arrival_id: job.route.to,
    outbound_date: job.departureDate,
    type: job.tripType === "return" ? "1" : "2",
    currency: "AED",
    gl: "ae",
    hl: "en",
    adults: "1",
    travel_class: "1",
    api_key: key,
  });
  if (job.tripType === "return" && job.returnDate) params.set("return_date", job.returnDate);

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    const msg: string = data.error || `HTTP ${res.status}`;
    // Google Flights returns no results when bookings are not open yet
    if (/hasn't returned any results|no results/i.test(msg)) {
      return { status: "not_available", priceAed: null, airline: null, stops: null, durationMin: null, priceInsights: null, error: msg };
    }
    return { status: "error", priceAed: null, airline: null, stops: null, durationMin: null, priceInsights: null, error: msg };
  }

  const options: SerpOption[] = [...(data.best_flights || []), ...(data.other_flights || [])].filter(
    (o: SerpOption) => typeof o.price === "number",
  );
  if (options.length === 0) {
    return { status: "not_available", priceAed: null, airline: null, stops: null, durationMin: null, priceInsights: data.price_insights ?? null };
  }

  const cheapest = options.reduce((a, b) => ((b.price as number) < (a.price as number) ? b : a));
  const airlines = Array.from(new Set((cheapest.flights || []).map((f) => f.airline).filter(Boolean)));
  return {
    status: "ok",
    priceAed: cheapest.price as number,
    airline: airlines.join(" + ") || null,
    stops: Math.max(0, (cheapest.flights?.length || 1) - 1),
    durationMin: cheapest.total_duration ?? null,
    priceInsights: data.price_insights ?? null,
  };
}
