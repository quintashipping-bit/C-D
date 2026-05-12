import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "../../firebase/config";
import Sidebar from "../../components/Sidebar";

export default function SouthAfricaSettings() {

  const [settings, setSettings] = useState({
    courierBase: {},
    courierPerKg: {}
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {

    try {

      const snap = await getDoc(
        doc(db, "settings", "southAfrica")
      );

      if (snap.exists()) {

        console.log("SA SETTINGS:", snap.data());

        setSettings({
          courierBase: snap.data().courierBase || {},
          courierPerKg: snap.data().courierPerKg || {}
        });
      }

    } catch (err) {

      console.error(err);
      alert("Failed to load South Africa settings");

    } finally {

      setLoading(false);

    }
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

  function updatePerKg(zone, value) {

    setSettings(prev => ({
      ...prev,
      courierPerKg: {
        ...prev.courierPerKg,
        [zone]: Number(value)
      }
    }));
  }

  async function save() {

    try {

      await updateDoc(
        doc(db, "settings", "southAfrica"),
        settings
      );

      alert("South Africa settings updated");

    } catch (err) {

      console.error(err);
      alert("Save failed");

    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold text-fuchsia-500 mb-8">
          South Africa Settings
        </h1>

        {/* BASE CHARGES */}

        <div className="bg-zinc-900 rounded-2xl p-6 mb-8">

          <h2 className="text-2xl font-bold mb-6">
            Zone Base Charges
          </h2>

          <div className="space-y-4">

            {Object.keys(settings.courierBase || {}).length === 0 && (
              <div className="text-zinc-500">
                No base charges found
              </div>
            )}

            {Object.keys(settings.courierBase || {}).map(zone => (

              <div
                key={zone}
                className="flex items-center justify-between gap-4"
              >

                <div className="w-24 font-bold">
                  Zone {zone}
                </div>

                <input
                  type="number"
                  value={settings.courierBase[zone]}
                  onChange={e =>
                    updateBase(zone, e.target.value)
                  }
                  className="
                    flex-1
                    bg-zinc-800
                    rounded-xl
                    p-3
                  "
                />

              </div>
            ))}

          </div>
        </div>

        {/* PER KG */}

        <div className="bg-zinc-900 rounded-2xl p-6 mb-8">

          <h2 className="text-2xl font-bold mb-6">
            Zone Per KG Rates
          </h2>

          <div className="space-y-4">

            {Object.keys(settings.courierPerKg || {}).length === 0 && (
              <div className="text-zinc-500">
                No KG rates found
              </div>
            )}

            {Object.keys(settings.courierPerKg || {}).map(zone => (

              <div
                key={zone}
                className="flex items-center justify-between gap-4"
              >

                <div className="w-24 font-bold">
                  Zone {zone}
                </div>

                <input
                  type="number"
                  value={settings.courierPerKg[zone]}
                  onChange={e =>
                    updatePerKg(zone, e.target.value)
                  }
                  className="
                    flex-1
                    bg-zinc-800
                    rounded-xl
                    p-3
                  "
                />

              </div>
            ))}

          </div>
        </div>

        <button
          onClick={save}
          className="
            bg-fuchsia-700
            hover:bg-fuchsia-600
            px-6
            py-3
            rounded-xl
            font-bold
          "
        >
          Save Settings
        </button>

      </div>
    </div>
  );
}
