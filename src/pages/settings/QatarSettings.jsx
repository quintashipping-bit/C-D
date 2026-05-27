import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

/* Defaults from Excel sheet "Qatar" */
const DEFAULTS = {
  dutyRate: 5,            // 5% of invoice value
  merchandiseProcessMin:   27.75,
  merchandiseProcessMax:   538.4,
  merchandiseProcessPct:   0.3464,  // % of value
  dutyTaxPaidFee:          25,
  /* Legalisation brackets — QAR values */
  legalisation: [
    { from: 1,       to: 15000,   attestation: 150, invoices: 500,  total: 650,  bracket: "A" },
    { from: 15001,   to: 100000,  attestation: 150, invoices: 1000, total: 1150, bracket: "B" },
    { from: 100001,  to: 250000,  attestation: 150, invoices: 2500, total: 2650, bracket: "C" },
    { from: 250001,  to: 1000000, attestation: 150, invoices: 5000, total: 5150, bracket: "D" },
  ],
  legalisationAboveRate: 0.6,  // 0.6% of invoice value for > QAR 1,000,000
  xRate: 4.924189,             // QAR per GBP (live exchange rate placeholder)
  notes: "Only Courier offered for Qatar. Air and Sea are not offered. This estimate is for general, non-hazardous cargo only. Hazardous cargo cannot be shipped DDP under any circumstances."
};

export default function QatarSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "qatar"));
      if (snap.exists()) setSettings(prev => deepMerge(prev, snap.data()));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "qatar"), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function setTop(k, v)    { setSettings(p => ({ ...p, [k]: Number(v) })); }
  function setNotes(v)     { setSettings(p => ({ ...p, notes: v })); }
  function setXRate(v)     { setSettings(p => ({ ...p, xRate: Number(v) })); }
  function setLegal(i, k, v) {
    const brackets = settings.legalisation.map((b, idx) =>
      idx === i ? { ...b, [k]: k === "bracket" ? v : Number(v) } : b
    );
    setSettings(p => ({ ...p, legalisation: brackets }));
  }

  if (loading) return <Shell><div className="p-10 text-slate-400">Loading…</div></Shell>;

  return (
    <Shell>
      <div className="flex-1 p-8 max-w-4xl">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Qatar Settings</h1>
          <button onClick={save} disabled={saving}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold">
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>

        {/* Core rates */}
        <Section title="Core Rates">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Duty rate (%)"                value={settings.dutyRate}               onChange={v => setTop("dutyRate", v)} />
            <Num label="Merchandise process min (GBP)" value={settings.merchandiseProcessMin}  onChange={v => setTop("merchandiseProcessMin", v)} />
            <Num label="Merchandise process max (GBP)" value={settings.merchandiseProcessMax}  onChange={v => setTop("merchandiseProcessMax", v)} />
            <Num label="Merchandise process % of value" value={settings.merchandiseProcessPct} onChange={v => setTop("merchandiseProcessPct", v)} step="0.0001" />
            <Num label="Duty tax paid fee (GBP)"       value={settings.dutyTaxPaidFee}         onChange={v => setTop("dutyTaxPaidFee", v)} />
            <Num label="Legalisation above-max rate (%)" value={settings.legalisationAboveRate} onChange={v => setTop("legalisationAboveRate", v)} step="0.01" />
            <div>
              <label className="block text-xs text-slate-400 mb-1">QAR per GBP exchange rate</label>
              <input type="number" step="0.000001" value={settings.xRate ?? ""}
                onChange={e => setXRate(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 text-sm" />
              <div className="text-xs text-slate-500 mt-1">Used to convert invoice value to QAR for legalisation bracket lookup</div>
            </div>
          </div>
        </Section>

        {/* Legalisation brackets */}
        <Section title="Legalisation Fee Brackets (QAR value)">
          <p className="text-slate-400 text-sm mb-4">
            The invoice value is converted to QAR using the exchange rate above, then matched to the bracket below to determine the legalisation fee (in QAR).
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 text-xs text-slate-500 uppercase tracking-wider px-2">
              <span>Bracket</span><span>From (QAR)</span><span>To (QAR)</span><span>Attestation</span><span>Invoices</span><span>Total fee</span>
            </div>
            {settings.legalisation.map((b, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-center bg-slate-800 rounded-xl p-3">
                <span className="font-bold text-fuchsia-400">{b.bracket}</span>
                <Num label="" value={b.from}        onChange={v => setLegal(i, "from", v)} />
                <Num label="" value={b.to}          onChange={v => setLegal(i, "to", v)} />
                <Num label="" value={b.attestation} onChange={v => setLegal(i, "attestation", v)} />
                <Num label="" value={b.invoices}    onChange={v => setLegal(i, "invoices", v)} />
                <Num label="" value={b.total}       onChange={v => setLegal(i, "total", v)} />
              </div>
            ))}
            <div className="bg-slate-800 rounded-xl p-3 text-sm text-slate-300">
              <strong>Bracket E</strong> (above QAR 1,000,000): <strong>{settings.legalisationAboveRate}%</strong> of QAR invoice value
            </div>
          </div>
        </Section>

        {/* Transport availability */}
        <Section title="Transport Options">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">📦</div>
              <div className="font-bold text-green-400">Courier</div>
              <div className="text-xs text-slate-400 mt-1">Available — DDP terms</div>
            </div>
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">✈️</div>
              <div className="font-bold text-red-400">Air</div>
              <div className="text-xs text-slate-400 mt-1">Not offered</div>
            </div>
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">🚢</div>
              <div className="font-bold text-red-400">Sea</div>
              <div className="text-xs text-slate-400 mt-1">Not offered</div>
            </div>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Destination Notes">
          <textarea rows={4} value={settings.notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-800 text-sm" />
        </Section>

        <button onClick={save} disabled={saving}
          className="bg-fuchsia-700 hover:bg-fuchsia-800 px-8 py-3 rounded-xl font-bold">
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save All Settings"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return <div className="flex bg-slate-950 text-white min-h-screen"><Sidebar />{children}</div>;
}
function Section({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 mb-6">
      <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </div>
  );
}
function Num({ label, value, onChange, step = "0.01" }) {
  return (
    <div>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <input type="number" step={step} value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full p-3 rounded-xl bg-slate-800 text-sm" />
    </div>
  );
}
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}
