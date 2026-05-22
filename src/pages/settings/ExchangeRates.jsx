// src/pages/settings/ExchangeRates.jsx
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";
import { getExchangeRates, SYMBOLS } from "../../services/exchangeRates";

const CURRENCIES = [
  { code: "AUD", name: "Australian Dollar",  flag: "🇦🇺", usedFor: "Australia" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", usedFor: "South Africa" },
  { code: "USD", name: "US Dollar",          flag: "🇺🇸", usedFor: "USA office" },
  { code: "EUR", name: "Euro",               flag: "🇪🇺", usedFor: "Germany office" },
  { code: "SGD", name: "Singapore Dollar",   flag: "🇸🇬", usedFor: "Singapore" },
  { code: "SAR", name: "Saudi Riyal",        flag: "🇸🇦", usedFor: "Saudi Arabia" },
  { code: "QAR", name: "Qatari Riyal",       flag: "🇶🇦", usedFor: "Qatar" },
];

const SOURCE_LABELS = {
  "open.er-api.com":       { label: "open.er-api.com",      color: "green" },
  "exchangerate-api.com":  { label: "exchangerate-api.com", color: "green" },
  "fawazahmed0/jsDelivr":  { label: "fawazahmed0 CDN",      color: "green" },
  "fawazahmed0/Cloudflare":{ label: "fawazahmed0 CF",       color: "green" },
  "cache":                 { label: "Cached today",         color: "blue"  },
  "manual":                { label: "Manual (admin set)",   color: "amber" },
  "fallback":              { label: "Hardcoded fallback",   color: "red"   },
};

export default function ExchangeRates() {
  const [rates, setRates]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manual override rates (admin can set these as safety net)
  const [manual, setManual]       = useState({});
  const [savingManual, setSavingManual] = useState(false);
  const [manualSaved, setManualSaved]   = useState(false);

  useEffect(() => { load(); loadManual(); }, []);

  async function load() {
    setLoading(true);
    const r = await getExchangeRates();
    setRates(r);
    setLoading(false);
  }

  async function loadManual() {
    try {
      const snap = await getDoc(doc(db, "settings", "exchangeRatesManual"));
      if (snap.exists() && snap.data().rates) {
        setManual(snap.data().rates);
      } else {
        // Pre-fill with current rates as starting point
        const r = await getExchangeRates();
        const m = {};
        CURRENCIES.forEach(c => { m[c.code] = r[c.code] ?? ""; });
        setManual(m);
      }
    } catch (e) { console.error(e); }
  }

  async function forceRefresh() {
    setRefreshing(true);
    // Bust the cache by setting date to something old
    try {
      await setDoc(doc(db, "settings", CACHE_KEY), { date: "0000-00-00" });
    } catch (e) { /* ignore */ }
    await load();
    setRefreshing(false);
  }

  async function saveManual() {
    setSavingManual(true);
    try {
      const ratesObj = {};
      CURRENCIES.forEach(c => {
        const v = Number(manual[c.code]);
        if (v > 0) ratesObj[c.code] = v;
      });
      ratesObj.GBP = 1;
      await setDoc(doc(db, "settings", "exchangeRatesManual"), {
        rates: ratesObj,
        updatedAt: new Date().toISOString(),
      });
      setManualSaved(true);
      setTimeout(() => setManualSaved(false), 3000);
    } catch (e) { alert("Failed to save manual rates"); }
    setSavingManual(false);
  }

  const src     = rates?._source || "";
  const srcInfo = SOURCE_LABELS[src] || { label: src, color: "zinc" };
  const isLive  = ["open.er-api.com","exchangerate-api.com","fawazahmed0/jsDelivr","fawazahmed0/Cloudflare"].includes(src);

  const CACHE_KEY = "fxRatesCache";

  if (loading) return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar /><div className="p-10 text-zinc-400">Loading exchange rates…</div>
    </div>
  );

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-3xl">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-2">Exchange Rates</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Rates are fetched daily from free public APIs (no key required) with automatic fallback.
          All rates: <strong>1 GBP = X foreign currency</strong>.
        </p>

        {/* Status banner */}
        <div className={`flex items-center justify-between p-4 rounded-xl mb-6 border ${
          srcInfo.color === "green" ? "bg-green-900/30 border-green-700" :
          srcInfo.color === "blue"  ? "bg-blue-900/30  border-blue-700"  :
          srcInfo.color === "amber" ? "bg-amber-900/30 border-amber-700" :
                                      "bg-red-900/30   border-red-700"
        }`}>
          <div>
            <div className={`font-bold text-sm ${
              srcInfo.color === "green" ? "text-green-300" :
              srcInfo.color === "blue"  ? "text-blue-300"  :
              srcInfo.color === "amber" ? "text-amber-300" : "text-red-300"
            }`}>
              {srcInfo.color === "green" ? "✅" :
               srcInfo.color === "blue"  ? "📋" :
               srcInfo.color === "amber" ? "⚠️" : "🔴"}{" "}
              {isLive ? `Live rates from ${srcInfo.label}` :
               src === "cache"    ? `Using today's cached rates (${srcInfo.label})` :
               src === "manual"   ? "Using admin-set manual rates (all live APIs failed)" :
                                    "Using hardcoded fallback rates — all sources failed"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Date: {rates?._date}
              {rates?._cached ? " · Read from Firestore cache" : " · Freshly fetched"}
            </div>
          </div>
          <button onClick={forceRefresh} disabled={refreshing}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap">
            {refreshing ? "Refreshing…" : "🔄 Force refresh"}
          </button>
        </div>

        {/* Rates table */}
        <div className="bg-zinc-900 rounded-2xl overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
            Current rates
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-zinc-400 font-medium">Currency</th>
                <th className="text-left p-4 text-zinc-400 font-medium">Used for</th>
                <th className="text-right p-4 text-zinc-400 font-medium">1 GBP =</th>
                <th className="text-right p-4 text-zinc-400 font-medium">1 unit = GBP</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-800/40 bg-zinc-800/20">
                <td className="p-4"><div className="flex items-center gap-2"><span>🇬🇧</span><span className="font-bold">GBP</span></div></td>
                <td className="p-4 text-zinc-400 text-xs">UK office</td>
                <td className="p-4 text-right font-mono">1.0000</td>
                <td className="p-4 text-right font-mono text-zinc-500">£1.0000</td>
              </tr>
              {CURRENCIES.map(({ code, name, flag, usedFor }) => {
                const r = rates?.[code];
                return (
                  <tr key={code} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span>{flag}</span>
                        <div>
                          <div className="font-bold">{code}</div>
                          <div className="text-xs text-zinc-500">{name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-zinc-400">{usedFor}</td>
                    <td className="p-4 text-right font-mono font-bold text-fuchsia-300">
                      {r ? r.toFixed(4) : <span className="text-red-400">missing</span>}
                    </td>
                    <td className="p-4 text-right font-mono text-zinc-400">
                      {r ? `£${(1 / r).toFixed(4)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Manual fallback rates */}
        <div className="bg-zinc-900 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-1">Manual fallback rates</h2>
          <p className="text-zinc-400 text-sm mb-4">
            These are used automatically if all live APIs fail. Keep them roughly up to date.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {CURRENCIES.map(({ code, flag }) => (
              <div key={code}>
                <label className="block text-xs text-zinc-400 mb-1">{flag} 1 GBP = {code}</label>
                <input
                  type="number" step="0.0001"
                  value={manual[code] ?? ""}
                  onChange={e => setManual(p => ({ ...p, [code]: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-zinc-800 text-sm font-mono"
                />
              </div>
            ))}
          </div>
          <button onClick={saveManual} disabled={savingManual}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold">
            {savingManual ? "Saving…" : manualSaved ? "✓ Saved!" : "Save manual rates"}
          </button>
          <p className="text-xs text-zinc-500 mt-3">
            These are only used when the live feed and cache both fail. Live rates always take priority.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-zinc-800 rounded-xl p-4 text-xs text-zinc-400 mt-6 space-y-1">
          <div className="font-bold text-zinc-300 text-sm mb-2">How the fallback chain works</div>
          {[
            ["1", "Firestore cache",          "Today's rates already fetched — instant load"],
            ["2", "open.er-api.com",          "Free, no key, CORS-enabled, ECB-aligned data"],
            ["3", "exchangerate-api.com",     "Free tier, no key required, CORS-enabled"],
            ["4", "fawazahmed0 jsDelivr CDN", "Static JSON on CDN — extremely reliable"],
            ["5", "fawazahmed0 Cloudflare",   "Backup CDN for the same dataset"],
            ["6", "Manual rates (above)",     "Admin-set rates saved here in Firestore"],
            ["7", "Hardcoded fallback",       "Built-in approximate rates — app never breaks"],
          ].map(([n, src, desc]) => (
            <div key={n} className="flex gap-2">
              <span className="text-fuchsia-400 font-bold w-4">{n}.</span>
              <span className="text-zinc-300 w-40 shrink-0">{src}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
