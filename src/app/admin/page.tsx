"use client";

import { useEffect, useState } from "react";

interface Run {
  id: number; kind: string; started_at: string; finished_at: string | null;
  searches_used: number; ok_count: number; error_count: number; notes: string | null;
}

export default function Admin() {
  const [pw, setPw] = useState("");
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [usage, setUsage] = useState<{ used: number; cap: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Count seconds while a run is in progress
  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function readJson(r: Response) {
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: `Server returned ${r.status}: ${text.slice(0, 200)}` };
    }
  }

  async function load(clearMsg = true) {
    if (clearMsg) setMsg("");
    try {
      const r = await fetch("/api/admin/status", { headers: { "x-admin-password": pw } });
      const d = await readJson(r);
      if (!r.ok) return setMsg(d.error || `Error ${r.status}`);
      setRuns(d.runs);
      setUsage({ used: d.searchesUsedThisMonth, cap: d.cap });
    } catch (e) {
      setMsg(`Could not load status: ${String(e)}`);
    }
  }

  async function runNow() {
    if (!confirm("Run all fare searches now? This uses about 28 SerpApi searches.")) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/run", { method: "POST", headers: { "x-admin-password": pw } });
      const d = await readJson(r);
      setMsg(
        r.ok
          ? d.skipped
            ? `Skipped: monthly cap reached (${d.usedSoFar}/${d.cap}).`
            : `Done: ${d.ok} prices saved, ${d.notAvailable} not yet available, ${d.errors} errors.`
          : `Run failed: ${d.error || r.status}`,
      );
    } catch (e) {
      setMsg(`Run failed: ${String(e)}`);
    } finally {
      setBusy(false);
      load(false);
    }
  }

  async function exportCsv() {
    const r = await fetch("/api/admin/export", { headers: { "x-admin-password": pw } });
    if (!r.ok) return setMsg("Export failed");
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fare-watch-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const btn = "rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">Fare Watch · Admin</h1>
      <div className="mb-4 flex gap-2">
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2" />
        <button className={btn} onClick={() => load()}>Open</button>
      </div>
      {busy && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-light p-4 text-sm text-brand">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <div>
            <p className="font-semibold">Processing… searching 28 fares ({seconds}s)</p>
            <p className="text-xs text-slate-600">
              {seconds < 15 ? "Contacting Google Flights…" : seconds < 35 ? "Collecting prices and saving them…" : "Almost done, finishing up…"}
              {" "}Usually 20–40 seconds. Please keep this page open.
            </p>
          </div>
        </div>
      )}
      {!busy && msg && (
        <p className={`mb-4 rounded-xl p-3 text-sm shadow-card ${msg.startsWith("Done") ? "bg-green-50 text-green-800" : msg.includes("failed") || msg.includes("Error") || msg.includes("Wrong") ? "bg-red-50 text-red-800" : "bg-white"}`}>
          {msg.startsWith("Done") ? "✅ " : msg.includes("failed") ? "❌ " : ""}{msg}
        </p>
      )}
      {runs && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <button className={btn} disabled={busy} onClick={runNow}>{busy ? "Running…" : "Run now"}</button>
            <button className={btn} onClick={exportCsv}>Export CSV</button>
            {usage && <span className="self-center text-sm text-slate-600">Searches this month: <b>{usage.used}</b> / {usage.cap}</span>}
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr><th className="p-3">Started</th><th className="p-3">Type</th><th className="p-3">Searches</th><th className="p-3">OK</th><th className="p-3">Errors</th><th className="p-3">Notes</th></tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-3">{new Date(r.started_at).toLocaleString("en-GB")}</td>
                    <td className="p-3">{r.kind}</td>
                    <td className="p-3">{r.searches_used}</td>
                    <td className="p-3">{r.ok_count}</td>
                    <td className="p-3">{r.error_count}</td>
                    <td className="p-3 text-slate-500">{r.notes ?? (r.finished_at ? "" : "running / failed")}</td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={6}>No runs yet. Click “Run now” for the first check.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
