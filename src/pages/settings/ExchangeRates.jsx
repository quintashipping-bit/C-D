import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

const DEFAULT_RATES = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  AUD: 1.97,
  ZAR: 23.5,
  SGD: 1.73,
  SAR: 4.76,
  QAR: 4.63,
  AED: 4.67,
  KWD: 0.39
};

export default function ExchangeRates() {
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "exchangeRates"));
      if (snap.exists()) {
        const d = snap.data();
        setRates(d.rates || DEFAULT_RATES);
        setLastUpdated(d.updatedAt || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      const now = new Date().toLocaleString("en-GB");
      await setDoc(doc(db, "settings", "exchangeRates"), {
        rates,
        updatedAt: now
      });
      setLastUpdated(now);
      alert("Exchange rates saved");
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function updateRate(code, val) {
    setRates(prev => ({ ...prev, [code]: Number(val) }));
  }

  if (loading) return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="p-10">Loading...</div>
    </div>
  );

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-3xl">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-2">Exchange Rates</h1>
        <p className="text-zinc-400 text-sm mb-6">
          All rates expressed as: 1 GBP = X foreign currency.
          {lastUpdated && <span className="ml-2 text-zinc-500">Last saved: {lastUpdated}</span>}
        </p>

        <div className="bg-zinc-900 rounded-2xl p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {Object.entries(rates).map(([code, rate]) => (
              <div key={code}>
                <label className="block text-sm text-zinc-400 mb-1">
                  1 GBP = {code}
                  {code === "GBP" && <span className="ml-2 text-zinc-600">(base — always 1)</span>}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={rate}
                  disabled={code === "GBP"}
                  onChange={e => updateRate(code, e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-800 disabled:opacity-40"
                />
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-400 mb-4">
              These rates are used by the quote engine when converting local currency totals back to GBP.
            </p>
            <button
              onClick={save}
              disabled={saving}
              className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold"
            >
              {saving ? "Saving…" : "Save Rates"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
