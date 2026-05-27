import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

const DEFAULTS = {
  courier: {
    handoverAirlineHandling: 850,
    communication:           180,
    importCustomsClearance:  480,
  },
  air: {
    handoverAirlineHandling: 2250,
    splitFee:                55,
    airlineHandlingPerKg:    1.8,
    communication:           90,
    documentation:           500,
  },
  sea: {
    provisionAgentCartage:   12000,
    agencyOnVDP:             985,
    documentation:           275,
    communication:           82,
    facilityFee:             500,
  },
  cartageBase:    6,
  fuelSurcharge:  0.5977,   // 59.77%
  agencyFee:      0.0375,   // 3.75% of invoice value
};

const LABELS = {
  courier: {
    handoverAirlineHandling: "Handover / Airline handling (ZAR)",
    communication:           "Communication (ZAR)",
    importCustomsClearance:  "Import customs clearance (ZAR)",
  },
  air: {
    handoverAirlineHandling: "Handover / Airline handling (ZAR)",
    splitFee:                "Split fee (ZAR)",
    airlineHandlingPerKg:    "Airline handling per kg (ZAR/kg)",
    communication:           "Communication (ZAR)",
    documentation:           "Documentation (ZAR)",
  },
  sea: {
    provisionAgentCartage:   "Provision for agent / cartage surcharges (ZAR)",
    agencyOnVDP:             "Agency on VDP (ZAR)",
    documentation:           "Documentation (ZAR)",
    communication:           "Communication (ZAR)",
    facilityFee:             "Facility fee (ZAR)",
  },
};

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

export default function SouthAfricaSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "southAfrica"));
      if (snap.exists()) setSettings(deepMerge(DEFAULTS, snap.data()));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "southAfrica"), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function setSection(section, key, val) {
    setSettings(p => ({ ...p, [section]: { ...p[section], [key]: Number(val) } }));
  }
  function setTop(key, val) {
    setSettings(p => ({ ...p, [key]: Number(val) }));
  }

  if (loading) return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar /><div className="p-10 text-slate-400">Loading…</div>
    </div>
  );

  const cartageTotal = (settings.cartageBase || 0) * (1 + (settings.fuelSurcharge || 0));

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-4xl">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">South Africa Settings</h1>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg font-semibold text-sm">
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          All values in ZAR. Defaults from Excel C&D Calculator V1.06.
        </p>

        {/* Cartage */}
        <Section title="Cartage (applies to all modes)">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Cartage base (ZAR)" value={settings.cartageBase}
              onChange={v => setTop("cartageBase", v)} />
            <Num label="Fuel surcharge rate" value={settings.fuelSurcharge} step="0.0001"
              onChange={v => setTop("fuelSurcharge", v)} />
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Total cartage (auto)</label>
              <div className="px-3 py-2.5 bg-slate-700 rounded-lg text-sm font-mono text-green-300">
                ZAR {cartageTotal.toFixed(4)}
              </div>
              <div className="text-xs text-slate-500 mt-1">= base × (1 + fuel rate)</div>
            </div>
          </div>
        </Section>

        {/* Agency */}
        <Section title="Agency Fee">
          <div className="grid md:grid-cols-2 gap-4">
            <Num label="Agency rate (% of invoice value)" value={settings.agencyFee} step="0.0001"
              onChange={v => setTop("agencyFee", v)} />
            <div className="flex items-end pb-1">
              <div className="text-xs text-slate-400">
                Applied to all modes as: invoice value × {((settings.agencyFee || 0) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </Section>

        {/* Courier */}
        <Section title="Courier Charges (ZAR)">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(LABELS.courier).map(([k, label]) => (
              <Num key={k} label={label}
                value={settings.courier?.[k] ?? DEFAULTS.courier[k]}
                onChange={v => setSection("courier", k, v)} />
            ))}
          </div>
        </Section>

        {/* Air */}
        <Section title="Air Freight Charges (ZAR)">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(LABELS.air).map(([k, label]) => (
              <Num key={k} label={label}
                value={settings.air?.[k] ?? DEFAULTS.air[k]}
                onChange={v => setSection("air", k, v)} />
            ))}
          </div>
        </Section>

        {/* Sea */}
        <Section title="Sea Freight Charges (ZAR)">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(LABELS.sea).map(([k, label]) => (
              <Num key={k} label={label}
                value={settings.sea?.[k] ?? DEFAULTS.sea[k]}
                onChange={v => setSection("sea", k, v)} />
            ))}
          </div>
        </Section>

        <button onClick={save} disabled={saving}
          className="px-8 py-3 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg font-semibold">
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-5">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-800 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Num({ label, value, onChange, step = "0.01" }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input type="number" step={step} value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm" />
    </div>
  );
}
