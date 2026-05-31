import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

const ZONES = ["TA1","NN1","QQ1","SS1","WW1","VV1","QQ2","QQ3","QQ4","VV2","WW2"];
const ZONE_CITIES = {
  TA1:"Tasmania", NN1:"Sydney", QQ1:"Brisbane", SS1:"Adelaide",
  WW1:"Perth", VV1:"Melbourne", QQ2:"Brisbane 2", QQ3:"Brisbane 3",
  QQ4:"Brisbane 4", VV2:"Melbourne 2", WW2:"Perth 2 (→WW1)"
};

const DEFAULTS = {
  fuelSurcharge: 0.406,
  t76: {
    TA1: { base: 17.91, perKg: 0.4158 },
    NN1: { base: 19.64, perKg: 0.5458 },
    QQ1: { base: 25.41, perKg: 0.7277 },
    SS1: { base: 31.19, perKg: 0.8577 },
    WW1: { base: 36.97, perKg: 1.1955 },
    VV1: { base: 42.74, perKg: 1.4814 },
    QQ2: { base: 48.52, perKg: 2.1312 },
    QQ3: { base: 60.07, perKg: 2.8069 },
    QQ4: { base: 65.85, perKg: 4.1584 },
    VV2: { base: 77.40, perKg: 4.6782 },
    WW2: { base: 36.97, perKg: 1.1955 },
  },
  s76: {
    TA1: { base: 15.00,  perKg: 0.8997  },
    NN1: { base: 20.99,  perKg: 2.9990  },
    QQ1: { base: 26.99,  perKg: 5.9980  },
    SS1: { base: 35.99,  perKg: 7.1976  },
    WW1: { base: 41.99,  perKg: 10.7964 },
    VV1: { base: 47.98,  perKg: 13.1956 },
    QQ2: { base: 74.98,  perKg: 16.1946 },
    QQ3: { base: 83.97,  perKg: 17.3942 },
    QQ4: { base: 119.96, perKg: 25.1916 },
    VV2: { base: 149.95, perKg: 28.1906 },
    WW2: { base: 41.99,  perKg: 10.7964 },
  },
  courier: {
    abfChargeOver1000:  190,
    disbursementFixed:  20,
    disbursementPctGBP: 0.03,
  },
  air: {
    electronicProcessingOver10k:      201,
    electronicProcessingUnder10k:     90,
    quarantineProcessing:             49,
    declarationOver10k:               152,
    declarationUnder10k:              50,
    destinationAirlineDocFee:         80,
    customsClearanceFee:              130,
    chainOfResponsibility:            10,
    cmrFee:                           20,
    destinationCargoTerminalOpsPerKg: 0.65,
    destinationIntlTerminalMin:       80,
    destinationIntlTerminalPerKg:     0.175,
    destinationQuarantineProcessing:  45,
    destinationHandling:              85,
  },
  sea: {
    destinationPortCharges:      95,
    destinationTerminalHandling: 20,
    deliveryOrderFee:            50,
    destinationQuarantineFee:    45,
    cmrFee:                      25,
    customsClearance:            125,
    electronicEntryProcessing:   201,
    quarantineProcessingFee:     49,
    declarationProcessingFee:    152,
    perCbmRate:                  20,
  },
};

const AIR_LABELS = {
  electronicProcessingOver10k:      "Electronic processing > AUD 10k",
  electronicProcessingUnder10k:     "Electronic processing < AUD 10k",
  quarantineProcessing:             "Quarantine processing",
  declarationOver10k:               "Declaration > AUD 10k",
  declarationUnder10k:              "Declaration < AUD 10k",
  destinationAirlineDocFee:         "Airline document fee",
  customsClearanceFee:              "Customs clearance fee",
  chainOfResponsibility:            "Chain of responsibility",
  cmrFee:                           "CMR fee",
  destinationCargoTerminalOpsPerKg: "Cargo terminal ops (AUD/kg)",
  destinationIntlTerminalMin:       "International terminal minimum (AUD)",
  destinationIntlTerminalPerKg:     "International terminal (AUD/kg)",
  destinationQuarantineProcessing:  "Destination quarantine processing",
  destinationHandling:              "Destination handling",
};

const SEA_LABELS = {
  destinationPortCharges:      "Destination port charges",
  destinationTerminalHandling: "Terminal handling",
  deliveryOrderFee:            "Delivery order fee",
  destinationQuarantineFee:    "Destination quarantine fee",
  cmrFee:                      "CMR fee",
  customsClearance:            "Customs clearance",
  electronicEntryProcessing:   "Electronic entry processing",
  quarantineProcessingFee:     "Quarantine processing fee",
  declarationProcessingFee:    "Declaration processing fee",
  perCbmRate:                  "Per CBM rate",
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

export default function AustraliaSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [previewWeight, setPreviewWeight] = useState(161);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "australia"));
      if (snap.exists()) setSettings(deepMerge(DEFAULTS, snap.data()));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "australia"), settings);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function setZone(service, zone, field, val) {
    setSettings(p => ({
      ...p,
      [service]: { ...p[service], [zone]: { ...p[service][zone], [field]: Number(val) } }
    }));
  }
  function setNested(section, key, val) {
    setSettings(p => ({ ...p, [section]: { ...p[section], [key]: Number(val) } }));
  }
  function setTop(key, val) {
    setSettings(p => ({ ...p, [key]: Number(val) }));
  }

  // Preview calculation for a zone
  function preview(zone, weight) {
    const fuel = settings.fuelSurcharge ?? 0.406;
    const t = settings.t76?.[zone];
    const s = settings.s76?.[zone];
    if (!t || !s) return null;
    const tF = t.base + Math.max(0, weight - 20) * t.perKg;
    const sF = s.base + Math.max(0, weight - 5)  * s.perKg;
    const tT = tF * (1 + fuel);
    const sT = sF * (1 + fuel);
    return { t76: tT, s76: sT, winner: tT <= sT ? "T76" : "S76" };
  }

  if (loading) return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar /><div className="p-10 text-slate-400">Loading…</div>
    </div>
  );

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-6xl overflow-x-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Australia Settings</h1>
            <p className="text-slate-400 text-sm mt-1">All values in AUD. Defaults from Excel C&D Calculator V1.06.</p>
          </div>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg font-semibold text-sm">
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>

        {/* ── Fuel surcharge ── */}
        <Section title="Local Delivery — Fuel Surcharge">
          <p className="text-slate-400 text-xs mb-3">
            Applied to both T76 and S76 freight totals. Formula: freight × (1 + rate).
          </p>
          <div className="flex items-center gap-6">
            <div className="w-48">
              <label className="block text-xs text-slate-400 mb-1.5">Fuel surcharge rate</label>
              <input type="number" step="0.001" value={settings.fuelSurcharge ?? 0.406}
                onChange={e => setTop("fuelSurcharge", e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm" />
            </div>
            <div className="text-slate-400 text-sm pt-5">
              = {((settings.fuelSurcharge ?? 0.406) * 100).toFixed(1)}% added to all local delivery charges
            </div>
          </div>
        </Section>

        {/* ── Delivery zone tables side by side ── */}
        <Section title="Local Delivery Zone Rates — T76 (20kg threshold) and S76 (5kg threshold)">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-slate-400 text-xs flex-1">
              The calculator tries both services for every shipment and uses whichever gives the <strong className="text-white">lower total cost</strong>.
              T76 formula: base + max(0, weight−20) × perKg, then × (1 + fuel).
              S76 formula: base + max(0, weight−5) × perKg, then × (1 + fuel).
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs text-slate-400">Preview weight (kg):</label>
              <input type="number" value={previewWeight}
                onChange={e => setPreviewWeight(Number(e.target.value))}
                className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-center" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800">
                  <th className="text-left px-3 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide border border-slate-700">Zone</th>
                  <th className="text-left px-3 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide border border-slate-700">City</th>
                  <th className="text-center px-3 py-2.5 text-xs text-[#C4006A] font-bold uppercase tracking-wide border border-slate-700" colSpan={2}>T76 (threshold 20kg)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-blue-400 font-bold uppercase tracking-wide border border-slate-700" colSpan={2}>S76 (threshold 5kg)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-slate-400 font-medium uppercase tracking-wide border border-slate-700" colSpan={3}>Preview at {previewWeight}kg</th>
                </tr>
                <tr className="bg-slate-800/50">
                  <th className="border border-slate-700 px-3 py-2"></th>
                  <th className="border border-slate-700 px-3 py-2"></th>
                  <th className="text-center px-3 py-2 text-xs text-slate-400 border border-slate-700">Base (AUD)</th>
                  <th className="text-center px-3 py-2 text-xs text-slate-400 border border-slate-700">Per kg &gt;20kg</th>
                  <th className="text-center px-3 py-2 text-xs text-slate-400 border border-slate-700">Base (AUD)</th>
                  <th className="text-center px-3 py-2 text-xs text-slate-400 border border-slate-700">Per kg &gt;5kg</th>
                  <th className="text-center px-3 py-2 text-xs text-[#C4006A] border border-slate-700">T76 total</th>
                  <th className="text-center px-3 py-2 text-xs text-blue-400 border border-slate-700">S76 total</th>
                  <th className="text-center px-3 py-2 text-xs text-green-400 border border-slate-700">Selected</th>
                </tr>
              </thead>
              <tbody>
                {ZONES.map(zone => {
                  const p = preview(zone, previewWeight);
                  return (
                    <tr key={zone} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="px-3 py-2 border border-slate-700 font-mono font-bold text-[#f472b6]">{zone}</td>
                      <td className="px-3 py-2 border border-slate-700 text-slate-400 text-xs">{ZONE_CITIES[zone]}</td>
                      {/* T76 */}
                      <td className="px-2 py-1.5 border border-slate-700">
                        <input type="number" step="0.01"
                          value={settings.t76?.[zone]?.base ?? ""}
                          onChange={e => setZone("t76", zone, "base", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-center" />
                      </td>
                      <td className="px-2 py-1.5 border border-slate-700">
                        <input type="number" step="0.0001"
                          value={settings.t76?.[zone]?.perKg ?? ""}
                          onChange={e => setZone("t76", zone, "perKg", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-center" />
                      </td>
                      {/* S76 */}
                      <td className="px-2 py-1.5 border border-slate-700">
                        <input type="number" step="0.01"
                          value={settings.s76?.[zone]?.base ?? ""}
                          onChange={e => setZone("s76", zone, "base", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-center" />
                      </td>
                      <td className="px-2 py-1.5 border border-slate-700">
                        <input type="number" step="0.0001"
                          value={settings.s76?.[zone]?.perKg ?? ""}
                          onChange={e => setZone("s76", zone, "perKg", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-center" />
                      </td>
                      {/* Preview */}
                      <td className="px-3 py-2 border border-slate-700 text-center font-mono text-xs text-[#f472b6]">
                        {p ? `AUD ${p.t76.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2 border border-slate-700 text-center font-mono text-xs text-blue-300">
                        {p ? `AUD ${p.s76.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-2 border border-slate-700 text-center text-xs font-bold">
                        {p ? (
                          <span className={p.winner === "T76" ? "text-[#f472b6]" : "text-blue-300"}>
                            {p.winner}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Preview column shows totals including {((settings.fuelSurcharge ?? 0.406) * 100).toFixed(1)}% fuel surcharge.
            "Selected" shows which service the calculator would choose at that weight.
          </p>
        </Section>

        {/* ── Courier ── */}
        <Section title="Courier Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="ABF charge (invoice > AUD 1,000)"    value={settings.courier?.abfChargeOver1000}  onChange={v => setNested("courier","abfChargeOver1000",v)} />
            <Num label="Disbursement fixed fee (AUD)"         value={settings.courier?.disbursementFixed}  onChange={v => setNested("courier","disbursementFixed",v)} />
            <Num label="Disbursement % of GBP invoice value"  value={settings.courier?.disbursementPctGBP} onChange={v => setNested("courier","disbursementPctGBP",v)} step="0.001" />
          </div>
        </Section>

        {/* ── Air ── */}
        <Section title="Air Freight Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {Object.entries(AIR_LABELS).map(([k, label]) => (
              <Num key={k} label={label}
                value={settings.air?.[k] ?? DEFAULTS.air[k]}
                onChange={v => setNested("air", k, v)}
                step={k.includes("PerKg") || k.includes("Pct") ? "0.001" : "0.01"} />
            ))}
          </div>
        </Section>

        {/* ── Sea ── */}
        <Section title="Sea Freight Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(SEA_LABELS).map(([k, label]) => (
              <Num key={k} label={label}
                value={settings.sea?.[k] ?? DEFAULTS.sea[k]}
                onChange={v => setNested("sea", k, v)} />
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
