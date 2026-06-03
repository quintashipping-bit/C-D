import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";
import { DEFAULT_T76, DEFAULT_S76 } from "../../logic/australia";

const ZONE_CODES = [
  "NN1","NN2","NN3","NN4","NN5","NN6",
  "NT1","NT2","NT3",
  "QQ1","QQ2","QQ3","QQ4","QQ5",
  "SS1","SS2","SS3",
  "TA1","TA2",
  "VV1","VV2","VV3",
  "WW1","WW2","WW3","WW4",
];
const ZONE_CITIES = {
  NN1:"Sydney / Canberra / Newcastle / Wollongong",
  NN2:"Coffs Harbour / Lismore / Port Macquarie",
  NN3:"Nowra",
  NN4:"Armidale / Tamworth",
  NN5:"Albury / Wodonga / Wagga Wagga",
  NN6:"Dubbo / Orange",
  NT1:"Darwin / Katherine",
  NT2:"Alice Springs / Tennant Creek",
  NT3:"Gove / Kununurra",
  QQ1:"Brisbane / Gold Coast / Toowoomba / Maroochydore",
  QQ2:"Rockhampton / Bundaberg / Emerald / Gladstone",
  QQ3:"Cairns / Townsville / Mackay",
  QQ4:"Mount Isa",
  QQ5:"Far remote Queensland",
  SS1:"Adelaide",
  SS2:"Mount Gambier / Broken Hill",
  SS3:"Far remote South Australia",
  TA1:"Hobart / Launceston",
  TA2:"Far remote Tasmania",
  VV1:"Melbourne / Geelong",
  VV2:"Ballarat / Bendigo / Shepparton / Warrnambool / Morwell",
  VV3:"Far remote Victoria",
  WW1:"Perth / Bunbury / Geraldton / Kalgoorlie",
  WW2:"Far remote Perth metro",
  WW3:"Broome / Port Hedland / Karratha / Newman / Carnarvon",
  WW4:"Leinster / far remote WA",
};

const DEFAULTS = {
  dutyRate:        0.05,
  fuelSurcharge:   0.406,
  courier: {
    abfChargeOver1000:    190,
    govtCharge:           190,
    disbursementFixed:    20,
    disbursementRate:     0.03,
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
    destinationPortCharges:       95,
    destinationTerminalHandling:  20,
    deliveryOrderFee:             50,
    destinationQuarantineFee:     45,
    cmrFee:                       25,
    customsClearance:             125,
    electronicEntryProcessing:    201,
    quarantineFee:                49,
    declarationFee:               152,
    perCbmRate:                   20,
  },
  t76Zones: { ...DEFAULT_T76 }, // all 26 zones — blank rates auto-filled from DEFAULT_T76
  s76Zones: { ...DEFAULT_S76 },
};

function deepMerge(target, source) {
  const out = { ...target };
  for (const k of Object.keys(source || {})) {
    if (source[k] && typeof source[k] === "object" && !Array.isArray(source[k])) {
      out[k] = deepMerge(target[k] || {}, source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

export default function AustraliaSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function setNested(section, key, val) {
    setSettings(p => ({ ...p, [section]: { ...p[section], [key]: Number(val) } }));
  }
  function setZone(table, zone, field, val) {
    setSettings(p => ({
      ...p,
      [table]: { ...p[table], [zone]: { ...p[table][zone], [field]: Number(val) } }
    }));
  }

  if (loading) return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar /><div className="p-10 text-slate-400">Loading…</div>
    </div>
  );

  const fuel = settings.fuelSurcharge ?? 0.406;

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-6xl overflow-auto">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Australia Settings</h1>
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg font-semibold text-sm">
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save All Settings"}
          </button>
        </div>

        {/* ── General ── */}
        <Section title="General Rates">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Duty rate (%)" value={settings.dutyRate} step="0.001"
              onChange={v => setSettings(p => ({...p, dutyRate: Number(v)}))} />
            <Num label="Fuel surcharge (local delivery)" value={settings.fuelSurcharge} step="0.001"
              onChange={v => setSettings(p => ({...p, fuelSurcharge: Number(v)}))} />
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Current fuel surcharge</label>
              <div className="px-3 py-2.5 bg-slate-700 rounded-lg text-sm font-mono text-green-300">
                {(fuel * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </Section>

        {/* ── Local Delivery — T76 and S76 ── */}
        <Section title="Local Delivery Rates — T76 and S76">
          <p className="text-slate-400 text-xs mb-4">
            The calculator computes the cost under both services and uses whichever is lower.
            <strong className="text-slate-300"> T76</strong>: charged per kg after 20kg threshold.
            <strong className="text-slate-300"> S76</strong>: charged per kg after 5kg threshold.
            Fuel surcharge ({(fuel*100).toFixed(1)}%) is added to both.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-3 py-2 text-xs text-slate-400 font-medium uppercase w-16">Zone</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-400 font-medium uppercase w-28">City</th>
                  <th className="px-3 py-2 text-xs text-[#C4006A] font-bold uppercase text-center" colSpan={2}>T76</th>
                  <th className="px-3 py-2 text-xs text-slate-500 font-bold uppercase text-center w-6"></th>
                  <th className="px-3 py-2 text-xs text-blue-400 font-bold uppercase text-center" colSpan={2}>S76</th>
                </tr>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="px-3 py-1.5"></th>
                  <th className="px-3 py-1.5"></th>
                  <th className="px-3 py-1.5 text-xs text-slate-400 font-medium text-right">Base rate (AUD)</th>
                  <th className="px-3 py-1.5 text-xs text-slate-400 font-medium text-right">Per kg after 20kg</th>
                  <th className="px-3 py-1.5"></th>
                  <th className="px-3 py-1.5 text-xs text-slate-400 font-medium text-right">Base rate (AUD)</th>
                  <th className="px-3 py-1.5 text-xs text-slate-400 font-medium text-right">Per kg after 5kg</th>
                </tr>
              </thead>
              <tbody>
                {ZONE_CODES.map((code, i) => {
                  const t = settings.t76Zones?.[code] || DEFAULT_T76[code];
                  const s = settings.s76Zones?.[code] || DEFAULT_S76[code];
                  return (
                    <tr key={code} className={`border-b border-slate-800/50 ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-800/20"}`}>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-[#C4006A] text-xs">{code}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{ZONE_CITIES[code]}</td>
                      {/* T76 */}
                      <td className="px-3 py-2">
                        <input type="number" step="0.01"
                          value={t?.base ?? ""}
                          onChange={e => setZone("t76Zones", code, "base", e.target.value)}
                          className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-right" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.0001"
                          value={t?.perKgAfter20 ?? ""}
                          onChange={e => setZone("t76Zones", code, "perKgAfter20", e.target.value)}
                          className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-right" />
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-center">|</td>
                      {/* S76 */}
                      <td className="px-3 py-2">
                        <input type="number" step="0.01"
                          value={s?.base ?? ""}
                          onChange={e => setZone("s76Zones", code, "base", e.target.value)}
                          className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-right" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.0001"
                          value={s?.perKgAfter5 ?? ""}
                          onChange={e => setZone("s76Zones", code, "perKgAfter5", e.target.value)}
                          className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-right" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-slate-800 rounded-lg text-xs text-slate-400">
            <strong className="text-slate-300">How the decision works:</strong> For a given zone and weight, the system calculates:
            T76 = (base + (weight − 20) × perKgAfter20) × (1 + fuel%) and
            S76 = (base + (weight − 5) × perKgAfter5) × (1 + fuel%).
            The lower total is used. Both amounts are shown on the quote for transparency.
          </div>
        </Section>

        {/* ── Courier ── */}
        <Section title="Courier Charges (AUD)">
          <div className="grid md:grid-cols-4 gap-4">
            <Num label="ABF charge (invoice > AUD 1,000)"  value={settings.courier?.abfChargeOver1000}  onChange={v => setNested("courier","abfChargeOver1000",v)} />
            <Num label="Australia Govt charge"              value={settings.courier?.govtCharge}         onChange={v => setNested("courier","govtCharge",v)} />
            <Num label="Disbursement fixed (AUD)"           value={settings.courier?.disbursementFixed}  onChange={v => setNested("courier","disbursementFixed",v)} />
            <Num label="Disbursement rate (% of GBP value)" value={settings.courier?.disbursementRate} step="0.001" onChange={v => setNested("courier","disbursementRate",v)} />
          </div>
        </Section>

        {/* ── Air ── */}
        <Section title="Air Freight Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Electronic processing > AUD 10k"  value={settings.air?.electronicProcessingOver10k}  onChange={v => setNested("air","electronicProcessingOver10k",v)} />
            <Num label="Electronic processing < AUD 10k"  value={settings.air?.electronicProcessingUnder10k} onChange={v => setNested("air","electronicProcessingUnder10k",v)} />
            <Num label="Quarantine processing"             value={settings.air?.quarantineProcessing}         onChange={v => setNested("air","quarantineProcessing",v)} />
            <Num label="Declaration > AUD 10k"             value={settings.air?.declarationOver10k}           onChange={v => setNested("air","declarationOver10k",v)} />
            <Num label="Declaration < AUD 10k"             value={settings.air?.declarationUnder10k}          onChange={v => setNested("air","declarationUnder10k",v)} />
            <Num label="Airline document fee"              value={settings.air?.destinationAirlineDocFee}     onChange={v => setNested("air","destinationAirlineDocFee",v)} />
            <Num label="Customs clearance fee"             value={settings.air?.customsClearanceFee}          onChange={v => setNested("air","customsClearanceFee",v)} />
            <Num label="Chain of responsibility"           value={settings.air?.chainOfResponsibility}        onChange={v => setNested("air","chainOfResponsibility",v)} />
            <Num label="CMR fee"                           value={settings.air?.cmrFee}                       onChange={v => setNested("air","cmrFee",v)} />
            <Num label="Destination quarantine"            value={settings.air?.destinationQuarantineProcessing} onChange={v => setNested("air","destinationQuarantineProcessing",v)} />
            <Num label="Destination handling"              value={settings.air?.destinationHandling}          onChange={v => setNested("air","destinationHandling",v)} />
            <Num label="Cargo terminal ops (per kg)"       value={settings.air?.destinationCargoTerminalOpsPerKg} step="0.001" onChange={v => setNested("air","destinationCargoTerminalOpsPerKg",v)} />
            <Num label="Intl terminal minimum (AUD)"       value={settings.air?.destinationIntlTerminalMin}   onChange={v => setNested("air","destinationIntlTerminalMin",v)} />
            <Num label="Intl terminal per kg"              value={settings.air?.destinationIntlTerminalPerKg} step="0.001" onChange={v => setNested("air","destinationIntlTerminalPerKg",v)} />
          </div>
        </Section>

        {/* ── Sea ── */}
        <Section title="Sea Freight Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Destination port charges"      value={settings.sea?.destinationPortCharges}      onChange={v => setNested("sea","destinationPortCharges",v)} />
            <Num label="Terminal handling"             value={settings.sea?.destinationTerminalHandling}  onChange={v => setNested("sea","destinationTerminalHandling",v)} />
            <Num label="Delivery order fee"            value={settings.sea?.deliveryOrderFee}             onChange={v => setNested("sea","deliveryOrderFee",v)} />
            <Num label="Destination quarantine fee"    value={settings.sea?.destinationQuarantineFee}     onChange={v => setNested("sea","destinationQuarantineFee",v)} />
            <Num label="CMR fee"                       value={settings.sea?.cmrFee}                       onChange={v => setNested("sea","cmrFee",v)} />
            <Num label="Customs clearance"             value={settings.sea?.customsClearance}             onChange={v => setNested("sea","customsClearance",v)} />
            <Num label="Electronic entry processing"   value={settings.sea?.electronicEntryProcessing}    onChange={v => setNested("sea","electronicEntryProcessing",v)} />
            <Num label="Quarantine fee"                value={settings.sea?.quarantineFee}                onChange={v => setNested("sea","quarantineFee",v)} />
            <Num label="Declaration fee"               value={settings.sea?.declarationFee}               onChange={v => setNested("sea","declarationFee",v)} />
            <Num label="Per CBM rate (AUD)"            value={settings.sea?.perCbmRate}                   onChange={v => setNested("sea","perCbmRate",v)} />
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
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-700 pb-2">{title}</h2>
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
