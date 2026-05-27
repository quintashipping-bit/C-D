import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

/* ── Default values taken directly from Excel sheet "Australia" ── */
const DEFAULTS = {
  dutyRate: 5,          // 5%
  gstRate: 10,          // 10%
  disbursementRate: 3,  // 3% of value
  courier: {
    abfChargeOver1000:  190,
    abfCharge1001:       88,
    abfChargeUnder1000:   0,
    disbursementFee:     20,
    govtCharge:         190,
  },
  air: {
    electronicProcessingOver10k: 201,
    electronicProcessingUnder10k: 90,
    quarantineProcessing:         49,
    declarationOver10k:          152,
    declarationUnder10k:          50,
    destinationAirlineDocFee:     80,
    customsClearanceFee:         130,
    chainOfResponsibility:        10,
    cmrFee:                       20,
    destinationCargoTerminalOpsPerKg: 0.65,   // per kg rate (no minimum)
    destinationIntlTerminalMin:       80,    // minimum charge (AUD)
    destinationIntlTerminalPerKg:     0.175, // per kg rate
    destinationQuarantineProcessing: 45,
    destinationHandling:          85,
    electronicEntryProcessing:   201,
    quarantineProcessingAir:      49,
    declarationProcessing:       152,
    fuelSurcharge:              40.6,  // % of freight
  },
  sea: {
    destinationPortCharges:       95,
    destinationTerminalHandling:  20,
    deliveryOrderFee:             50,
    destinationQuarantineFee:     45,
    cmrFee:                       25,
    customsClearance:            125,
    electronicEntryProcessing:   201,
    quarantineProcessingFee:      49,
    declarationProcessingFee:    152,
    perCbmRate:                   20,
  },
  /* Local delivery zones — from Excel zone table */
  deliveryZones: {
    NN1: { label: "Sydney",    baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    VV1: { label: "Melbourne", baseRate: 42.74,  perKgAfter20kg: 1.4814  },
    QQ1: { label: "Brisbane",  baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    SS1: { label: "Adelaide",  baseRate: 42.74,  perKgAfter20kg: 1.4814  },
    WW1: { label: "Perth",     baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    QQ2: { label: "Brisbane 2",baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    QQ3: { label: "Brisbane 3",baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    QQ4: { label: "Brisbane 4",baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    VV2: { label: "Melbourne 2",baseRate: 42.74, perKgAfter20kg: 1.4814  },
    WW2: { label: "Perth 2",   baseRate: 47.98,  perKgAfter5kg: 13.1956  },
    TA1: { label: "Tasmania",  baseRate: 47.98,  perKgAfter5kg: 13.1956  },
  }
};

export default function AustraliaSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "australia"));
      if (snap.exists()) {
        // Merge with defaults so any new fields added later still appear
        setSettings(prev => deepMerge(prev, snap.data()));
      }
      // If doc doesn't exist yet, we keep DEFAULTS — user can save them in
    } catch (e) {
      console.error("Failed to load Australia settings:", e);
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "australia"), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save — check console");
    }
    setSaving(false);
  }

  function setNested(section, key, val) {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: Number(val) }
    }));
  }

  function setZoneField(zone, field, val) {
    setSettings(prev => ({
      ...prev,
      deliveryZones: {
        ...prev.deliveryZones,
        [zone]: { ...prev.deliveryZones[zone], [field]: field === "label" ? val : Number(val) }
      }
    }));
  }

  if (loading) return <Shell><div className="p-10 text-zinc-400">Loading settings…</div></Shell>;

  return (
    <Shell>
      <div className="flex-1 p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-fuchsia-500">Australia Settings</h1>
          <button
            onClick={save}
            disabled={saving}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold"
          >
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>

        <p className="text-zinc-400 text-sm mb-6">
          All values sourced from the C&D Calculator Excel spreadsheet. Edit and save to override.
        </p>

        {/* ── General rates ── */}
        <Section title="General Rates">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Duty rate (%)" value={settings.dutyRate}
              onChange={v => setSettings(p => ({...p, dutyRate: Number(v)}))} />
            <Num label="GST rate (%)" value={settings.gstRate}
              onChange={v => setSettings(p => ({...p, gstRate: Number(v)}))} />
            <Num label="Disbursement rate (%)" value={settings.disbursementRate}
              onChange={v => setSettings(p => ({...p, disbursementRate: Number(v)}))} />
          </div>
        </Section>

        {/* ── Courier ── */}
        <Section title="Courier Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="ABF charge (value > AUD 1,000)" value={settings.courier.abfChargeOver1000} onChange={v => setNested("courier","abfChargeOver1000",v)} />
            <Num label="ABF charge (AUD 1,001 bracket)" value={settings.courier.abfCharge1001}      onChange={v => setNested("courier","abfCharge1001",v)} />
            <Num label="ABF charge (value ≤ AUD 1,000)" value={settings.courier.abfChargeUnder1000} onChange={v => setNested("courier","abfChargeUnder1000",v)} />
            <Num label="Disbursement fee (AUD)"          value={settings.courier.disbursementFee}    onChange={v => setNested("courier","disbursementFee",v)} />
            <Num label="Govt charge (AUD)"               value={settings.courier.govtCharge}         onChange={v => setNested("courier","govtCharge",v)} />
          </div>
        </Section>

        {/* ── Air ── */}
        <Section title="Air Freight Charges (AUD)">
          <p className="text-zinc-400 text-xs mb-4">
            Threshold charges switch on AUD invoice value. Cargo Terminal Ops and International Terminal are weight-based.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Electronic processing > AUD 10k" value={settings.air.electronicProcessingOver10k}  onChange={v => setNested("air","electronicProcessingOver10k",v)} />
            <Num label="Electronic processing < AUD 10k" value={settings.air.electronicProcessingUnder10k} onChange={v => setNested("air","electronicProcessingUnder10k",v)} />
            <Num label="Quarantine processing (fixed)"    value={settings.air.quarantineProcessing}         onChange={v => setNested("air","quarantineProcessing",v)} />
            <Num label="Declaration > AUD 10k"            value={settings.air.declarationOver10k}           onChange={v => setNested("air","declarationOver10k",v)} />
            <Num label="Declaration < AUD 10k"            value={settings.air.declarationUnder10k}          onChange={v => setNested("air","declarationUnder10k",v)} />
            <Num label="Airline document fee (fixed)"     value={settings.air.destinationAirlineDocFee}     onChange={v => setNested("air","destinationAirlineDocFee",v)} />
            <Num label="Customs clearance fee (fixed)"    value={settings.air.customsClearanceFee}          onChange={v => setNested("air","customsClearanceFee",v)} />
            <Num label="Chain of responsibility (fixed)"  value={settings.air.chainOfResponsibility}        onChange={v => setNested("air","chainOfResponsibility",v)} />
            <Num label="CMR fee (fixed)"                  value={settings.air.cmrFee}                       onChange={v => setNested("air","cmrFee",v)} />
            <Num label="Destination quarantine (fixed)"   value={settings.air.destinationQuarantineProcessing} onChange={v => setNested("air","destinationQuarantineProcessing",v)} />
            <Num label="Destination handling (fixed)"     value={settings.air.destinationHandling}          onChange={v => setNested("air","destinationHandling",v)} />
          </div>

          <div className="mt-6 border-t border-zinc-700 pt-4">
            <h3 className="text-sm font-bold text-zinc-300 mb-1">Cargo Terminal Ops</h3>
            <p className="text-zinc-500 text-xs mb-3">Charged per kg — no fixed minimum. Formula: weight × rate</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Num label="Rate per kg (AUD)" value={settings.air.destinationCargoTerminalOpsPerKg} step="0.001" onChange={v => setNested("air","destinationCargoTerminalOpsPerKg",v)} />
            </div>
            <div className="mt-2 p-3 bg-zinc-800 rounded-xl text-xs text-zinc-400">
              Example: 161 kg × {settings.air.destinationCargoTerminalOpsPerKg} = AUD {(161 * (settings.air.destinationCargoTerminalOpsPerKg||0)).toFixed(2)}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-bold text-zinc-300 mb-1">International Terminal</h3>
            <p className="text-zinc-500 text-xs mb-3">Formula: max(minimum, weight × rate per kg)</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Num label="Minimum charge (AUD)"  value={settings.air.destinationIntlTerminalMin}   onChange={v => setNested("air","destinationIntlTerminalMin",v)} />
              <Num label="Rate per kg (AUD)"     value={settings.air.destinationIntlTerminalPerKg} step="0.001" onChange={v => setNested("air","destinationIntlTerminalPerKg",v)} />
            </div>
            <div className="mt-2 p-3 bg-zinc-800 rounded-xl text-xs text-zinc-400">
              Example: max({settings.air.destinationIntlTerminalMin}, 161 kg × {settings.air.destinationIntlTerminalPerKg}) = AUD {Math.max(settings.air.destinationIntlTerminalMin||0, 161*(settings.air.destinationIntlTerminalPerKg||0)).toFixed(2)}
            </div>
          </div>
        </Section>

        {/* ── Sea ── */}
        <Section title="Sea Freight Charges (AUD)">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(settings.sea).map(([k, v]) => (
              <Num key={k} label={camel(k)} value={v} onChange={val => setNested("sea", k, val)} />
            ))}
          </div>
        </Section>

        {/* ── Delivery zones ── */}
        <Section title="Local Delivery Zones (AUD)">
          <p className="text-zinc-400 text-sm mb-4">
            These are the local delivery rates per zone code used in the calculator. Each customer is assigned a zone in the Customers page.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3 text-xs text-zinc-500 uppercase tracking-wider px-1">
              <span>Zone code</span><span>City / label</span><span>Base delivery rate</span><span>Rate per kg (after threshold)</span>
            </div>
            {Object.entries(settings.deliveryZones).map(([code, z]) => (
              <div key={code} className="grid grid-cols-4 gap-3 items-center bg-zinc-800 rounded-xl p-3">
                <span className="font-mono font-bold text-fuchsia-400">{code}</span>
                <input value={z.label} onChange={e => setZoneField(code, "label", e.target.value)}
                  className="p-2 rounded-lg bg-zinc-700 text-sm" />
                <input type="number" step="0.01"
                  value={z.baseRate ?? ""} onChange={e => setZoneField(code, "baseRate", e.target.value)}
                  className="p-2 rounded-lg bg-zinc-700 text-sm" />
                <input type="number" step="0.0001"
                  value={z.perKgAfter5kg ?? z.perKgAfter20kg ?? ""}
                  onChange={e => setZoneField(code, z.perKgAfter20kg !== undefined ? "perKgAfter20kg" : "perKgAfter5kg", e.target.value)}
                  className="p-2 rounded-lg bg-zinc-700 text-sm" />
              </div>
            ))}
          </div>
        </Section>

        <button
          onClick={save}
          disabled={saving}
          className="bg-fuchsia-700 hover:bg-fuchsia-800 px-8 py-3 rounded-xl font-bold mt-2"
        >
          {saving ? "Saving…" : saved ? "✓ Saved!" : "Save All Settings"}
        </button>
      </div>
    </Shell>
  );
}

/* ── Helpers ── */
function Shell({ children }) {
  return <div className="flex bg-zinc-950 text-white min-h-screen"><Sidebar />{children}</div>;
}

function Section({ title, children }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Num({ label, value, onChange, step = "0.01" }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input type="number" step={step} value={value ?? ""} onChange={e => onChange(e.target.value)}
        className="w-full p-3 rounded-xl bg-zinc-800 text-sm" />
    </div>
  );
}

function camel(str) {
  return str.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
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
