import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

export default function QatarSettings() {
  const [settings, setSettings] = useState({
    dutyRate: 5,
    qarGbpRate: 4.65,
    legalisationBrackets: [
      { upTo: 15000,  fee: 650 },
      { upTo: 100000, fee: 1150 },
      { upTo: 250000, fee: 2650 },
      { upTo: 1000000,fee: 5150 }
    ],
    legalisationAboveRate: 0.6
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snap = await getDoc(doc(db, "settings", "qatar"));
      if (snap.exists()) setSettings(snap.data());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "qatar"), settings);
      alert("Qatar settings saved");
    } catch (e) { alert("Failed to save"); }
    setSaving(false);
  }

  function updateBracket(i, field, val) {
    const brackets = [...settings.legalisationBrackets];
    brackets[i] = { ...brackets[i], [field]: Number(val) };
    setSettings(p => ({ ...p, legalisationBrackets: brackets }));
  }

  if (loading) return <Loading />;

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-3xl">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-6">Qatar Settings</h1>

        <div className="bg-zinc-900 rounded-2xl p-6 space-y-6">

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Duty rate (%)" value={settings.dutyRate} onChange={v => setSettings(p => ({...p, dutyRate: Number(v)}))} />
            <Field label="QAR per GBP (fixed rate)" value={settings.qarGbpRate} onChange={v => setSettings(p => ({...p, qarGbpRate: Number(v)}))} />
            <Field label="Legalisation above-max rate (%)" value={settings.legalisationAboveRate} onChange={v => setSettings(p => ({...p, legalisationAboveRate: Number(v)}))} />
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3">Legalisation Brackets (QAR)</h2>
            <div className="space-y-2">
              {settings.legalisationBrackets.map((b, i) => (
                <div key={i} className="grid grid-cols-2 gap-3">
                  <Field label={`Up to QAR`} value={b.upTo} onChange={v => updateBracket(i, "upTo", v)} />
                  <Field label={`Fee (QAR)`} value={b.fee} onChange={v => updateBracket(i, "fee", v)} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold">
            {saving ? "Saving…" : "Save Qatar Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-800" />
    </div>
  );
}
function Loading() {
  return <div className="flex bg-zinc-950 text-white min-h-screen"><Sidebar /><div className="p-10">Loading...</div></div>;
}
