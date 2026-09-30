// ------------------------------------------------------------
// TRACKED TRIPS — edit this file to add routes or change dates.
// Each run searches every departure date x trip type below.
// Searches per run = routes x seasons x dates x trip types.
// ------------------------------------------------------------

export type Season = "peak" | "off";
export type TripType = "oneway" | "return";

export interface SeasonConfig {
  key: Season;
  label: string;
  labelTe: string;
  departureDates: string[]; // YYYY-MM-DD
}

export interface RouteConfig {
  id: string; // e.g. "DXB-HYD"
  from: string; // airport code
  to: string;
  fromName: string;
  toName: string;
  seasons: SeasonConfig[];
}

// Days between outbound and return for return trips
export const RETURN_STAY_DAYS = 21;

// Estimated child fare as a share of the adult fare (shown as "estimate")
export const CHILD_FARE_RATIO = 0.75;

function dateRange(start: string, days: number): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  for (let i = 0; i < days; i++) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export const ROUTES: RouteConfig[] = [
  {
    id: "DXB-HYD",
    from: "DXB",
    to: "HYD",
    fromName: "Dubai",
    toName: "Hyderabad",
    seasons: [
      { key: "peak", label: "Peak", labelTe: "పీక్", departureDates: dateRange("2027-07-01", 7) },
      { key: "off", label: "Off-season", labelTe: "ఆఫ్-సీజన్", departureDates: dateRange("2027-09-08", 7) },
    ],
  },
];

export const TRIP_TYPES: TripType[] = ["oneway", "return"];

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface SearchJob {
  route: RouteConfig;
  season: Season;
  tripType: TripType;
  departureDate: string;
  returnDate: string | null;
}

export function allSearchJobs(): SearchJob[] {
  const jobs: SearchJob[] = [];
  for (const route of ROUTES) {
    for (const season of route.seasons) {
      for (const dep of season.departureDates) {
        for (const tripType of TRIP_TYPES) {
          jobs.push({
            route,
            season: season.key,
            tripType,
            departureDate: dep,
            returnDate: tripType === "return" ? addDays(dep, RETURN_STAY_DAYS) : null,
          });
        }
      }
    }
  }
  return jobs;
}
