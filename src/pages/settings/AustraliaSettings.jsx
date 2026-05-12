import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

export default function AustraliaSettings() {
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    airClearanceFee: 0,
    seaClearanceFee: 0,
    courierClearanceFee: 0,
    fuelPercent: 0,

    localDelivery: {
      "ZONE 1": 0,
      "ZONE 2": 0,
      "ZONE 3": 0,
      "ZONE 4": 0,
      "ZONE 5": 0
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const ref = doc(db, "settings", "australia");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setSettings(snap.data());
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  function update(field, value) {
    setSettings(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  }

  function updateZone(zone, value) {
    setSettings(prev => ({
      ...prev,
      localDelivery: {
        ...prev.localDelivery,
        [zone]: Number(value)
      }
    }));
  }

  async function saveSettings() {
    try {
      await setDoc(
        doc(db, "settings", "australia"),
        settings
      );

      alert("Australia settings saved");
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
          Australia Settings
        </h1>

        <div className="bg-zinc-900 rounded-2xl p-6 space-y-8">

          {/* CLEARANCE */}

          <div>
            <h2 className="text-xl font-bold mb-4">
              Clearance Fees
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <Input
                label="Air Clearance Fee"
                value={settings.airClearanceFee}
                onChange={v => update("airClearanceFee", v)}
              />

              <Input
                label="Sea Clearance Fee"
                value={settings.seaClearanceFee}
                onChange={v => update("seaClearanceFee", v)}
              />

              <Input
                label="Courier Clearance Fee"
                value={settings.courierClearanceFee}
                onChange={v => update("courierClearanceFee", v)}
              />

              <Input
                label="Fuel %"
                value={settings.fuelPercent}
                onChange={v => update("fuelPercent", v)}
              />

            </div>
          </div>

          {/* LOCAL DELIVERY */}

          <div>
            <h2 className="text-xl font-bold mb-4">
              Local Delivery Rates
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {Object.keys(settings.localDelivery).map(zone => (
                <Input
                  key={zone}
                  label={zone}
                  value={settings.localDelivery[zone]}
                  onChange={v => updateZone(zone, v)}
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
