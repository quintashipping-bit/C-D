import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

export default function Settings() {
  const [saudi, setSaudi] = useState({
    dutyRate: "",
    minMerchandise: "",
    maxMerchandise: "",
    percentage: "",
    taxPaidFee: ""
  });

  const [qatar, setQatar] = useState({
    dutyRate: "",
    fxRate: ""
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const saudiSnap = await getDoc(
      doc(db, "settings", "saudi")
    );

    const qatarSnap = await getDoc(
      doc(db, "settings", "qatar")
    );

    if (saudiSnap.exists()) {
      setSaudi(saudiSnap.data());
    }

    if (qatarSnap.exists()) {
      setQatar(qatarSnap.data());
    }
  }

  async function save() {
    await setDoc(
      doc(db, "settings", "saudi"),
      saudi
    );

    await setDoc(
      doc(db, "settings", "qatar"),
      qatar
    );

    alert("Settings Saved");
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8 max-w-3xl">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Settings
        </h1>

        <div className="bg-zinc-900 p-6 rounded-2xl space-y-8">

          <div>
            <h2 className="text-xl mb-4">
              Saudi Arabia
            </h2>

            <input
              className="w-full p-3 mb-3 rounded bg-zinc-800"
              placeholder="Duty Rate"
              value={saudi.dutyRate}
              onChange={e =>
                setSaudi({
                  ...saudi,
                  dutyRate: e.target.value
                })
              }
            />

            <input
              className="w-full p-3 mb-3 rounded bg-zinc-800"
              placeholder="Tax Paid Fee"
              value={saudi.taxPaidFee}
              onChange={e =>
                setSaudi({
                  ...saudi,
                  taxPaidFee: e.target.value
                })
              }
            />
          </div>

          <div>
            <h2 className="text-xl mb-4">
              Qatar
            </h2>

            <input
              className="w-full p-3 mb-3 rounded bg-zinc-800"
              placeholder="FX Rate"
              value={qatar.fxRate}
              onChange={e =>
                setQatar({
                  ...qatar,
                  fxRate: e.target.value
                })
              }
            />
          </div>

          <button
            onClick={save}
            className="w-full bg-fuchsia-700 p-3 rounded-xl"
          >
            Save Settings
          </button>

        </div>

      </div>
    </div>
  );
}
