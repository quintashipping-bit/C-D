import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

export default function SaudiSettings() {
  const [settings, setSettings] = useState({
    dutyRate: 5,
    clearanceRate: 0.3464,
    clearanceMin: 27.75,
    clearanceMax: 538.4,
    deliveryFlat: 25
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "saudi"));
      if (snap.exists()) setSettings(snap.data());
    } catch (e) { console.error(e); }
    setLoading(false);
  }
  async function save() {
    setSaving(true);
    try { await setDoc(doc(db, "settings", "saudi"), settings); alert("Saudi settings saved"); }
    catch (e) { alert("Failed"); }
    setSaving(false);
  }
  if (loading) return <div className="flex bg-slate-950 text-white min-h-screen"><Sidebar /><div className="p-10">Loading...</div></div>;
  return (
    <div className="flex bg-slate-950 text-white min-h-screen"><Sidebar />
      <div className="flex-1 p-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-6">Saudi Arabia Settings</h1>
        <div className="bg-slate-900 rounded-xl p-6 space-y-4">
          {[
            ["Duty rate (%)", "dutyRate"],
            ["Clearance rate (% of value)", "clearanceRate"],
            ["Clearance minimum (SAR)", "clearanceMin"],
            ["Clearance maximum (SAR)", "clearanceMax"],
            ["Flat delivery fee (SAR)", "deliveryFlat"]
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-sm text-slate-400 mb-1">{label}</label>
              <input type="number" step="0.0001" value={settings[key]}
                onChange={e => setSettings(p => ({...p, [key]: Number(e.target.value)}))}
                className="w-full p-3 rounded-xl bg-slate-800" />
            </div>
          ))}
          <button onClick={save} disabled={saving} className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold">
            {saving ? "Saving…" : "Save Saudi Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
