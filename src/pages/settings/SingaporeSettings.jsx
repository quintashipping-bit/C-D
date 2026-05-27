import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

/* Defaults from Excel sheet "Singapore" */
const DEFAULTS = {
  air: {
    documentation:   35,
    customsExamination: 15,
    transport:      210,
    labour:          65,
    terminalCharge:  25,
    agencyCharge:    16.1,
  },
  sea: {
    documentation:   40,
    handlingFee:    100,
    deliveryOrderFee: 140,
    labour:          65,
    permit:          40,
    importProcessing: 60,
    forklift:        65,
    agencyFee:       45,
    transportation:  210,
    chargesOutlayed: 650,
    perCbmRate:       20,   // SGD 20 per CBM
  },
  /* Courier: not offered — see destination notes */
  notes: "When quoting Power Seraya or Keppel Seggers we ship on terms DAP not DDP. Courier is not an option unless an additional 7% GST is added or the client uses Deugro's deferment account."
};

export default function SingaporeSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "singapore"));
      if (snap.exists()) {
        setSettings(prev => deepMerge(prev, snap.data()));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "singapore"), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function setAir(k, v)  { setSettings(p => ({ ...p, air:  { ...p.air,  [k]: Number(v) } })); }
  function setSea(k, v)  { setSettings(p => ({ ...p, sea:  { ...p.sea,  [k]: Number(v) } })); }
  function setNotes(v)   { setSettings(p => ({ ...p, notes: v })); }

  if (loading) return <Shell><div className="p-10 text-slate-400">Loading…</div></Shell>;

  const airTotal = Object.values(settings.air).reduce((a, b) => a + Number(b), 0);
  const seaFixed = Object.entries(settings.sea)
    .filter(([k]) => k !== "perCbmRate")
    .reduce((a, [, v]) => a + Number(v), 0);

  return (
    <Shell>
      <div className="flex-1 p-8 max-w-4xl">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Singapore Settings</h1>
          <button onClick={save} disabled={saving}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold">
            {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>

        {/* Air */}
        <Section title={`Air Freight Charges (SGD) — Total: SGD ${airTotal.toFixed(2)}`}>
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Documentation"        value={settings.air.documentation}        onChange={v => setAir("documentation", v)} />
            <Num label="Customs examination"  value={settings.air.customsExamination}   onChange={v => setAir("customsExamination", v)} />
            <Num label="Transport"            value={settings.air.transport}             onChange={v => setAir("transport", v)} />
            <Num label="Labour"               value={settings.air.labour}               onChange={v => setAir("labour", v)} />
            <Num label="Terminal charge"      value={settings.air.terminalCharge}       onChange={v => setAir("terminalCharge", v)} />
            <Num label="Agency charge"        value={settings.air.agencyCharge}         onChange={v => setAir("agencyCharge", v)} />
          </div>
          <div className="mt-3 p-3 bg-slate-800 rounded-xl text-sm text-slate-300">
            <strong>Total Air:</strong> SGD {airTotal.toFixed(2)} (fixed — no variable components for air)
          </div>
        </Section>

        {/* Sea */}
        <Section title={`Sea Freight Charges (SGD) — Fixed: SGD ${seaFixed.toFixed(2)} + variable CBM`}>
          <div className="grid md:grid-cols-3 gap-4">
            <Num label="Documentation"       value={settings.sea.documentation}      onChange={v => setSea("documentation", v)} />
            <Num label="Handling fee"        value={settings.sea.handlingFee}         onChange={v => setSea("handlingFee", v)} />
            <Num label="Delivery order fee"  value={settings.sea.deliveryOrderFee}    onChange={v => setSea("deliveryOrderFee", v)} />
            <Num label="Labour"              value={settings.sea.labour}              onChange={v => setSea("labour", v)} />
            <Num label="Permit"              value={settings.sea.permit}              onChange={v => setSea("permit", v)} />
            <Num label="Import processing"   value={settings.sea.importProcessing}    onChange={v => setSea("importProcessing", v)} />
            <Num label="Forklift"            value={settings.sea.forklift}            onChange={v => setSea("forklift", v)} />
            <Num label="Agency fee"          value={settings.sea.agencyFee}           onChange={v => setSea("agencyFee", v)} />
            <Num label="Transportation"      value={settings.sea.transportation}      onChange={v => setSea("transportation", v)} />
            <Num label="Charges outlayed"    value={settings.sea.chargesOutlayed}     onChange={v => setSea("chargesOutlayed", v)} />
            <Num label="Per CBM rate (SGD)"  value={settings.sea.perCbmRate}          onChange={v => setSea("perCbmRate", v)} />
          </div>
          <div className="mt-3 p-3 bg-slate-800 rounded-xl text-sm text-slate-300">
            <strong>Total Sea:</strong> SGD {seaFixed.toFixed(2)} fixed + SGD {settings.sea.perCbmRate} per CBM
          </div>
        </Section>

        {/* Courier */}
        <Section title="Courier">
          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 text-amber-200 text-sm">
            ⚠ Singapore does not offer Courier under standard terms — see destination notes below.
          </div>
        </Section>

        {/* Notes */}
        <Section title="Destination Notes">
          <textarea
            rows={4}
            value={settings.notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-800 text-sm"
          />
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
function Num({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input type="number" step="0.01" value={value ?? ""}
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
