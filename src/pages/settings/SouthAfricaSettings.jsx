import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

export default function SouthAfricaSettings() {
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    courierBase: {
      A: 0,
      B: 0,
      C: 0,
      D: 0
    },

    courierPerKg: {
      A: 0,
      B: 0,
      C: 0,
      D: 0
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const ref = doc(db, "settings", "southAfrica");

      const snap = await getDoc(ref);

      if (snap.exists()) {
        setSettings(snap.data());
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  function updateBase(zone, value) {
    setSettings(prev => ({
      ...prev,
      courierBase: {
        ...prev.courierBase,
        [zone]: Number(value)
      }
    }));
  }

  function updateKg(zone, value) {
    setSettings(prev => ({
      ...prev,
      courierPerKg: {
        ...prev.courierPerKg,
        [zone]: Number(value)
      }
    }));
  }

  async function saveSettings() {
    try {
      await setDoc(
        doc(db, "settings", "southAfrica"),
        settings
      );

      alert("South Africa settings saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-950 text-white min-h-screen flex">
        <Sidebar />
        <div className="p-10">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-white min-h-screen flex">
      <Sidebar />

      <div className="flex-1 p-8 max-w-5xl">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          South Africa Settings
        </h1>

        <div className="bg-zinc-900 rounded-2xl p-6 space-y-10">

          {/* BASE */}

          <div>
            <h2 className="text-xl font-bold mb-4">
              Courier Base Charges
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {Object.keys(settings.courierBase).map(zone => (
                <Input
                  key={zone}
                  label={`Zone ${zone}`}
                  value={settings.courierBase[zone]}
                  onChange={v => updateBase(zone, v)}
                />
              ))}

            </div>
          </div>

          {/* KG */}

          <div>
            <h2 className="text-xl font-bold mb-4">
              Per KG Rates
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {Object.keys(settings.courierPerKg).map(zone => (
                <Input
                  key={zone}
                  label={`Zone ${zone}`}
                  value={settings.courierPerKg[zone]}
                  onChange={v => updateKg(zone, v)}
                />
              ))}

            </div>
          </div>

          <button
            onClick={saveSettings}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-3 rounded-xl font-bold"
          >
            Save Settings
          </button>

        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-2">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-3 rounded-xl bg-zinc-800"
      />
    </div>
  );
}
