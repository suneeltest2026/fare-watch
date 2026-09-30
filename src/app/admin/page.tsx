"use client";

import { useState } from "react";

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

  async function load() {
    setMsg("");
    const r = await fetch("/api/admin/status", { headers: { "x-admin-password": pw } });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error || "Error");
    setRuns(d.runs);
    setUsage({ used: d.searchesUsedThisMonth, cap: d.cap });
  }

  async function runNow() {
    if (!confirm("Run all fare searches now? This uses about 28 SerpApi searches.")) return;
    setBusy(true);
    setMsg("Running… this can take up to a minute.");
    const r = await fetch("/api/admin/run", { method: "POST", headers: { "x-admin-password": pw } });
    const d = await r.json();
    setBusy(false);
    setMsg(r.ok ? (d.skipped ? `Skipped: monthly cap reached (${d.usedSoFar}/${d.cap}).` : `Done: ${d.ok} prices saved, ${d.notAvailable} not yet available, ${d.errors} errors.`) : d.error || "Error");
    load();
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
        <button className={btn} onClick={load}>Open</button>
      </div>
      {msg && <p className="mb-4 rounded-xl bg-white p-3 text-sm shadow-card">{msg}</p>}
      {runs && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <button className={btn} disabled={busy} onClick={runNow}>Run now</button>
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
