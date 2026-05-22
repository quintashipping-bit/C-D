// src/pages/settings/ExchangeRates.jsx
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";
import { getExchangeRates, SYMBOLS } from "../../services/exchangeRates";

export default function ExchangeRates() {
  const [liveRates, setLiveRates]   = useState(null);
  const [liveInfo, setLiveInfo]     = useState("");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const CURRENCIES = [
    { code: "AUD", name: "Australian Dollar",  flag: "🇦🇺" },
    { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
    { code: "USD", name: "US Dollar",          flag: "🇺🇸" },
    { code: "EUR", name: "Euro",               flag: "🇪🇺" },
    { code: "SGD", name: "Singapore Dollar",   flag: "🇸🇬" },
    { code: "SAR", name: "Saudi Riyal",        flag: "🇸🇦" },
    { code: "QAR", name: "Qatari Riyal",       flag: "🇶🇦" },
  ];

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const r = await getExchangeRates();
    setLiveRates(r);
    const src =
      r._source === "live"     ? `Live from frankfurter.app / ECB (${r._date})` :
      r._source === "cache"    ? `Cached from earlier today (${r._date})` :
                                  "Fallback rates (API unavailable)";
    setLiveInfo(src);
    setLoading(false);
  }

  async function forceRefresh() {
    setRefreshing(true);
    // Delete cache so getExchangeRates fetches fresh
    try {
      await setDoc(doc(db, "settings", "fxRatesCache"), { date: "force-refresh" });
    } catch (e) { console.warn(e); }
    await load();
    setRefreshing(false);
  }

  if (loading) return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="p-10 text-zinc-400">Loading exchange rates…</div>
    </div>
  );

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-3xl">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-2">Exchange Rates</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Rates are fetched automatically once per day from{" "}
          <a href="https://www.frankfurter.app" target="_blank" rel="noreferrer"
            className="text-fuchsia-400 underline">frankfurter.app</a>{" "}
          (European Central Bank data — free, no API key required) and cached in Firestore.
          All rates shown as: <strong>1 GBP = X currency</strong>.
        </p>

        {/* Status banner */}
        <div className={`flex items-center justify-between p-4 rounded-xl mb-6 border ${
          liveRates?._source === "live"
            ? "bg-green-900/30 border-green-700"
            : liveRates?._source === "cache"
            ? "bg-blue-900/30 border-blue-700"
            : "bg-amber-900/30 border-amber-700"
        }`}>
          <div>
            <div className={`font-bold text-sm ${
              liveRates?._source === "live" ? "text-green-300" :
              liveRates?._source === "cache" ? "text-blue-300" : "text-amber-300"
            }`}>
              {liveRates?._source === "live"  ? "✅ Live rates loaded" :
               liveRates?._source === "cache" ? "📋 Using cached rates" :
                                                "⚠ Using fallback rates"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">{liveInfo}</div>
          </div>
          <button
            onClick={forceRefresh}
            disabled={refreshing}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-xl text-sm font-bold"
          >
            {refreshing ? "Refreshing…" : "Force refresh"}
          </button>
        </div>

        {/* Rates table */}
        <div className="bg-zinc-900 rounded-2xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-zinc-400 font-medium">Currency</th>
                <th className="text-right p-4 text-zinc-400 font-medium">1 GBP =</th>
                <th className="text-right p-4 text-zinc-400 font-medium">1 unit = GBP</th>
                <th className="text-right p-4 text-zinc-400 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {/* GBP base */}
              <tr className="border-b border-zinc-800/50 bg-zinc-800/30">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span>🇬🇧</span>
                    <div>
                      <div className="font-bold">GBP</div>
                      <div className="text-xs text-zinc-400">British Pound (base)</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right font-mono font-bold">1.0000</td>
                <td className="p-4 text-right font-mono text-zinc-400">£1.0000</td>
                <td className="p-4 text-right text-xs text-zinc-500">Base</td>
              </tr>

              {CURRENCIES.map(({ code, name, flag }) => {
                const rate = liveRates?.[code];
                return (
                  <tr key={code} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span>{flag}</span>
                        <div>
                          <div className="font-bold">{code}</div>
                          <div className="text-xs text-zinc-400">{name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-fuchsia-300">
                      {rate ? rate.toFixed(4) : "—"}
                    </td>
                    <td className="p-4 text-right font-mono text-zinc-300">
                      {rate ? `£${(1 / rate).toFixed(4)}` : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        liveRates?._source === "live"
                          ? "bg-green-900/50 text-green-300"
                          : liveRates?._source === "cache"
                          ? "bg-blue-900/50 text-blue-300"
                          : "bg-amber-900/50 text-amber-300"
                      }`}>
                        {liveRates?._source === "live" ? "ECB live" :
                         liveRates?._source === "cache" ? "cached" : "fallback"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info box */}
        <div className="bg-zinc-800 rounded-xl p-4 text-sm text-zinc-400 space-y-2">
          <div className="font-bold text-zinc-300">How it works</div>
          <ul className="space-y-1 list-disc list-inside text-xs">
            <li>Rates are fetched once per calendar day from frankfurter.app (ECB source)</li>
            <li>The daily fetch is cached in Firestore — subsequent page loads use the cache</li>
            <li>If the API is unavailable, built-in fallback rates are used</li>
            <li>Use "Force refresh" to fetch new rates immediately (e.g. after a market-moving event)</li>
            <li>The Quote Engine uses these rates to convert local currency inputs (AUD, ZAR etc.) to GBP before running the cost calculation</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
