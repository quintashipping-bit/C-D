import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

export default function SingaporeSettings() {
  const [settings, setSettings] = useState({
    air: { permit: 35, customs: 15, handling: 210, documentation: 65, gstRate: 15, disbursementRate: 10 },
    sea: { docs: 40, declaration: 100, terminal: 140, permit: 65, thc: 40, handling: 60, deliveryOrder: 65, customs: 45, destination: 210, transportCharge: 650, cbmRate: 79 }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const snap = await getDoc(doc(db, "settings", "singapore")); if (snap.exists()) setSettings(snap.data()); }
    catch (e) { console.error(e); }
    setLoading(false);
  }
  async function save() {
    setSaving(true);
    try { await setDoc(doc(db, "settings", "singapore"), settings); alert("Singapore settings saved"); }
    catch (e) { alert("Failed"); }
    setSaving(false);
  }
  function updateAir(k, v) { setSettings(p => ({ ...p, air: { ...p.air, [k]: Number(v) } })); }
  function updateSea(k, v) { setSettings(p => ({ ...p, sea: { ...p.sea, [k]: Number(v) } })); }

  if (loading) return <div className="flex bg-zinc-950 text-white min-h-screen"><Sidebar /><div className="p-10">Loading...</div></div>;

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen"><Sidebar />
      <div className="flex-1 p-8 max-w-5xl">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-6">Singapore Settings</h1>
        <div className="bg-zinc-900 rounded-2xl p-6 space-y-8">

          <div>
            <h2 className="text-xl font-bold mb-4">Air Charges</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(settings.air).map(([k, v]) => (
                <div key={k}><label className="block text-sm text-zinc-400 mb-1">{k}</label>
                  <input type="number" value={v} onChange={e => updateAir(k, e.target.value)} className="w-full p-3 rounded-xl bg-zinc-800" /></div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Sea Charges</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(settings.sea).map(([k, v]) => (
                <div key={k}><label className="block text-sm text-zinc-400 mb-1">{k}</label>
                  <input type="number" value={v} onChange={e => updateSea(k, e.target.value)} className="w-full p-3 rounded-xl bg-zinc-800" /></div>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold">
            {saving ? "Saving…" : "Save Singapore Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
