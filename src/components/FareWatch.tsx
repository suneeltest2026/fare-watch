"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SITE } from "@/config/site";

export interface FareRow {
  check_date: string;
  route: string;
  season: "peak" | "off";
  trip_type: "oneway" | "return";
  departure_date: string;
  price_aed: number;
  airline: string | null;
  stops: number | null;
}

interface SeasonInfo { key: "peak" | "off"; label: string; labelTe: string; firstDeparture: string; lastDeparture: string }
interface RouteInfo { id: string; label: string; seasons: SeasonInfo[] }

const CHILD_RATIO = 0.75;

const T = {
  en: {
    subtitle: "How much does booking early save?",
    saved: "Booking early saved",
    perAdult: "per adult vs. the latest price",
    lowestNow: "Today's fare is the lowest we've tracked",
    started: "Tracking started",
    return: "Return",
    oneway: "One-way",
    adults: "Adults",
    children: "Children",
    chart: "Lowest fare, week by week",
    weeksBefore: "weeks before travel",
    cheapest: "Cheapest so far",
    latest: "Latest price",
    checked: "checked",
    family: "Your total",
    estimate: "children estimated at 75% of adult fare",
    addBag: "+ Add baggage cost",
    bagLabel: "Baggage cost (AED, total)",
    bagNote: "Budget fares may not include checked baggage. Check before booking.",
    compare: "Peak vs off-season",
    noData: "Tracking starts soon. The first prices appear after the first weekly check.",
    weeks: "weeks before",
    nonstop: "Non-stop",
    stop: "stop",
    stopsWord: "stops",
    travel: "Travel",
  },
  te: {
    subtitle: "ముందుగా బుక్ చేస్తే ఎంత ఆదా?",
    saved: "ముందుగా బుక్ చేస్తే ఆదా",
    perAdult: "ఒక్కరికి, తాజా ధరతో పోలిస్తే",
    lowestNow: "ఇప్పటి వరకు ఇదే తక్కువ ధర",
    started: "ట్రాకింగ్ మొదలైంది",
    return: "రిటర్న్",
    oneway: "వన్-వే",
    adults: "పెద్దలు",
    children: "పిల్లలు",
    chart: "వారం వారం తక్కువ ధర",
    weeksBefore: "ప్రయాణానికి ముందు వారాలు",
    cheapest: "ఇప్పటివరకు తక్కువ",
    latest: "తాజా ధర",
    checked: "చెక్ చేసిన తేదీ",
    family: "మీ మొత్తం ఖర్చు",
    estimate: "పిల్లల ధర పెద్దవారి ధరలో 75% అంచనా",
    addBag: "+ బ్యాగేజ్ ఖర్చు జోడించండి",
    bagLabel: "బ్యాగేజ్ ఖర్చు (AED, మొత్తం)",
    bagNote: "చౌక ఫేర్లలో చెక్-ఇన్ బ్యాగేజ్ ఉండకపోవచ్చు. బుక్ చేసే ముందు చెక్ చేయండి.",
    compare: "పీక్ vs ఆఫ్-సీజన్",
    noData: "త్వరలో ట్రాకింగ్ మొదలవుతుంది. మొదటి వారం చెక్ తర్వాత ధరలు కనిపిస్తాయి.",
    weeks: "వారాల ముందు",
    nonstop: "నాన్-స్టాప్",
    stop: "స్టాప్",
    stopsWord: "స్టాప్స్",
    travel: "ప్రయాణం",
  },
};

type Lang = keyof typeof T;

const aed = (n: number) => `AED ${Math.round(n).toLocaleString("en-US")}`;
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);

interface Point { checkDate: string; weeksBefore: number; price: number; airline: string | null; stops: number | null; departure: string }

/** For each check date, the cheapest fare across the season's departure dates. */
function buildSeries(rows: FareRow[], routeId: string, season: SeasonInfo, tripType: "oneway" | "return"): Point[] {
  const byDate = new Map<string, FareRow>();
  for (const r of rows) {
    if (r.route !== routeId || r.season !== season.key || r.trip_type !== tripType) continue;
    const cur = byDate.get(r.check_date);
    if (!cur || r.price_aed < cur.price_aed) byDate.set(r.check_date, r);
  }
  return Array.from(byDate.values())
    .sort((a, b) => a.check_date.localeCompare(b.check_date))
    .map((r) => ({
      checkDate: r.check_date,
      weeksBefore: Math.max(0, Math.round(daysBetween(r.check_date, season.firstDeparture) / 7)),
      price: r.price_aed,
      airline: r.airline,
      stops: r.stops,
      departure: r.departure_date,
    }));
}

function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="grid grid-flow-col auto-cols-fr rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            value === o.value ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = "h-7 w-7 shrink-0 rounded-full border border-slate-200 text-lg leading-none text-slate-600 disabled:opacity-30 hover:border-brand hover:text-brand transition";
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-2.5 py-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`fewer ${label}`}>−</button>
        <span className="num w-5 text-center font-semibold">{value}</span>
        <button className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`more ${label}`}>+</button>
      </div>
    </div>
  );
}

export default function FareWatch({ rows, routes }: { rows: FareRow[]; routes: RouteInfo[] }) {
  const [lang, setLang] = useState<Lang>("en");
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [season, setSeason] = useState<"peak" | "off">("peak");
  const [tripType, setTripType] = useState<"oneway" | "return">("return");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showBag, setShowBag] = useState(false);
  const [bag, setBag] = useState("");
  const t = T[lang];

  const route = routes.find((r) => r.id === routeId) ?? routes[0];
  const seasonInfo = route.seasons.find((s) => s.key === season) ?? route.seasons[0];

  const series = useMemo(() => buildSeries(rows, route.id, seasonInfo, tripType), [rows, route.id, seasonInfo, tripType]);
  const latest = series[series.length - 1];
  const cheapest = series.length ? series.reduce((a, b) => (b.price < a.price ? b : a)) : undefined;
  const saved = latest && cheapest ? latest.price - cheapest.price : 0;

  const otherSeasons = route.seasons.map((s) => {
    const sr = buildSeries(rows, route.id, s, tripType);
    return { s, latest: sr[sr.length - 1] };
  });

  const bagAmount = Math.max(0, Number(bag) || 0);
  const childFare = latest ? Math.round(latest.price * CHILD_RATIO) : 0;
  const total = latest ? latest.price * adults + childFare * children + bagAmount : 0;

  const stopsText = (n: number | null) =>
    n === null ? "" : n === 0 ? t.nonstop : `${n} ${n === 1 ? t.stop : t.stopsWord}`;

  const seasonLabel = (s: SeasonInfo) => (lang === "te" ? s.labelTe : s.label);

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">
            Fare Watch <span className="font-medium text-slate-400">by {SITE.by}</span>
          </h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "te" : "en")}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand transition"
        >
          {lang === "en" ? "తెలుగు" : "English"}
        </button>
      </header>

      {/* Route + travel dates */}
      {routes.length > 1 ? (
        <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold">
          {routes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      ) : (
        <p className="mb-3 text-sm font-semibold text-slate-700">
          {route.label} · <span className="font-normal text-slate-500">{t.travel} {fmtDate(seasonInfo.firstDeparture)} – {fmtDate(seasonInfo.lastDeparture)}</span>
        </p>
      )}

      {/* Hero */}
      <section className="mb-5 rounded-2xl bg-brand p-6 text-white shadow-card">
        {series.length === 0 ? (
          <p className="text-base font-medium leading-relaxed">{t.noData}</p>
        ) : series.length === 1 || saved <= 0 ? (
          <>
            <p className="text-sm font-medium text-white/80">{series.length === 1 ? `${t.started} · ${fmtDate(series[0].checkDate)}` : t.lowestNow}</p>
            <p className="num mt-1 text-4xl font-extrabold tracking-tight">{aed(latest!.price)}</p>
            <p className="mt-1 text-sm text-white/80">{t.latest}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-white/80">{t.saved}</p>
            <p className="num mt-1 text-4xl font-extrabold tracking-tight">{aed(saved)}</p>
            <p className="mt-1 text-sm text-white/80">{t.perAdult}</p>
          </>
        )}
      </section>

      {/* Controls */}
      <section className="mb-5 space-y-2.5">
        <Segmented value={season} onChange={setSeason} options={route.seasons.map((s) => ({ value: s.key, label: seasonLabel(s) }))} />
        <Segmented value={tripType} onChange={setTripType} options={[{ value: "return", label: t.return }, { value: "oneway", label: t.oneway }]} />
        <div className="grid grid-cols-2 gap-2.5">
          <Stepper label={t.adults} value={adults} min={1} max={6} onChange={setAdults} />
          <Stepper label={t.children} value={children} min={0} max={4} onChange={setChildren} />
        </div>
      </section>

      {/* Chart */}
      {series.length > 0 && (
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">{t.chart}</h2>
          <p className="mb-3 text-xs text-slate-400">{t.weeksBefore} →</p>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="weeksBefore" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(w) => `${w}w`} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} tickFormatter={(v) => Math.round(v).toLocaleString("en-US")} />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as Point;
                    return (
                      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-card">
                        <p className="num text-base font-bold text-ink">{aed(p.price)}</p>
                        <p className="text-slate-600">{p.airline ?? ""}{p.stops !== null ? ` · ${stopsText(p.stops)}` : ""}</p>
                        <p className="text-slate-400">{p.weeksBefore} {t.weeks} · {t.checked} {fmtDate(p.checkDate)}</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="price" stroke="#1453b8" strokeWidth={2.5} dot={{ r: 3, fill: "#1453b8" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Cheapest + latest */}
      {latest && cheapest && (
        <section className="mb-5 grid grid-cols-2 gap-3">
          {[{ title: t.cheapest, p: cheapest }, { title: t.latest, p: latest }].map(({ title, p }) => (
            <div key={title} className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs font-medium text-slate-500">{title}</p>
              <p className="num mt-1 text-2xl font-bold">{aed(p.price)}</p>
              <p className="mt-1 text-xs text-slate-500">{p.airline}{p.stops !== null ? ` · ${stopsText(p.stops)}` : ""}</p>
              <p className="text-xs text-slate-400">{p.weeksBefore} {t.weeks} · {fmtDate(p.checkDate)}</p>
            </div>
          ))}
        </section>
      )}

      {/* Family total */}
      {latest && (
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-slate-700">{t.family}</p>
            <p className="num text-2xl font-extrabold text-brand">{aed(total)}</p>
          </div>
          <p className="num mt-1 text-xs text-slate-500">
            {adults} × {aed(latest.price)}
            {children > 0 && ` + ${children} × ${aed(childFare)}`}
            {bagAmount > 0 && ` + ${aed(bagAmount)}`}
          </p>
          {children > 0 && <p className="mt-0.5 text-xs text-slate-400">{t.estimate}</p>}
          {!showBag ? (
            <button onClick={() => setShowBag(true)} className="mt-3 text-sm font-semibold text-brand hover:underline">{t.addBag}</button>
          ) : (
            <label className="mt-3 block">
              <span className="text-xs font-medium text-slate-500">{t.bagLabel}</span>
              <input
                inputMode="numeric"
                value={bag}
                onChange={(e) => setBag(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="num mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-brand"
              />
            </label>
          )}
          <p className="mt-3 text-xs text-slate-400">{t.bagNote}</p>
        </section>
      )}

      {/* Peak vs off-season */}
      {otherSeasons.filter((o) => o.latest).length > 1 && (
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-card">
          <p className="mb-3 text-sm font-semibold text-slate-700">{t.compare}</p>
          <div className="grid grid-cols-2 gap-3">
            {otherSeasons.map(({ s, latest: l }) => (
              <div key={s.key} className={`rounded-xl p-3 ${s.key === season ? "bg-brand-light" : "bg-slate-50"}`}>
                <p className="text-xs font-medium text-slate-500">{seasonLabel(s)}</p>
                <p className="num text-lg font-bold">{l ? aed(l.price) : "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-400">
        <p>
          Data collected weekly by MoneyMuni from Google Flights via SerpApi. Prices are the lowest found at the time of
          checking and may differ when booking. Educational only, not financial advice.
        </p>
        <div className="mt-3 flex gap-4 font-semibold text-slate-500">
          <a href={SITE.youtube} target="_blank" rel="noreferrer" className="hover:text-brand">YouTube</a>
          <a href={SITE.instagram} target="_blank" rel="noreferrer" className="hover:text-brand">Instagram</a>
        </div>
      </footer>
    </main>
  );
}
