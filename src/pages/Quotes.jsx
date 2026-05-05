import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

/* ✅ IMPORT AUSTRALIA ENGINE */
import { calculateAustraliaExact } from "../logic/australia";

export default function Quotes() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [settings, setSettings] = useState({
    saudi: null,
    qatar: null,
    singapore: null
  });

  const [form, setForm] = useState({
    customerId: "",
    value: "",
    weight: "",
    pieces: "",
    cbm: "",
    transport: "Courier"
  });

  const [result, setResult] = useState(null);

  useEffect(() => {
    loadCustomers();
    loadSettings();
  }, []);

  async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));

    setCustomers(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
    );
  }

  async function loadSettings() {
    const saudiSnap = await getDoc(doc(db, "settings", "saudi"));
    const qatarSnap = await getDoc(doc(db, "settings", "qatar"));
    const singaporeSnap = await getDoc(doc(db, "settings", "singapore"));

    setSettings({
      saudi: saudiSnap.exists() ? saudiSnap.data() : null,
      qatar: qatarSnap.exists() ? qatarSnap.data() : null,
      singapore: singaporeSnap.exists() ? singaporeSnap.data() : null
    });
  }

  function update(name, value) {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function selectCustomer(id) {
    const customer = customers.find(c => c.id === id) || null;

    setSelectedCustomer(customer);

    setForm(prev => ({
      ...prev,
      customerId: id
    }));

    setResult(null);
  }

  /* =====================================================
     SAUDI
  ===================================================== */

  function calculateSaudi(value) {
    const duty = value * 0.05;

    let clearance = value * 0.003464;
    if (clearance < 27.75) clearance = 27.75;
    if (clearance > 538.4) clearance = 538.4;

    return {
      country: "Saudi Arabia",
      currency: "GBP",
      duty,
      clearance,
      delivery: 25,
      total: duty + clearance + 25
    };
  }

  /* =====================================================
     QATAR
  ===================================================== */

  function calculateQatar(value) {
    const duty = value * 0.05;
    const qar = value * 4.65;

    let legal = 0;

    if (qar <= 15000) legal = 650;
    else if (qar <= 100000) legal = 1150;
    else if (qar <= 250000) legal = 2650;
    else if (qar <= 1000000) legal = 5150;
    else legal = qar * 0.006;

    return {
      country: "Qatar",
      currency: "QAR",
      duty,
      clearance: legal,
      delivery: 0,
      total: duty + legal
    };
  }

  /* =====================================================
     SINGAPORE
  ===================================================== */

  function calculateSingapore(value) {
    const cbm = Number(form.cbm || 0);

    if (form.transport === "Air") {
      const total =
        35 + 15 + 210 + 65 +
        value * 0.15 +
        value * 0.10;

      return {
        country: "Singapore",
        currency: "SGD",
        duty: 0,
        clearance: total,
        delivery: 0,
        total
      };
    }

    if (form.transport === "Sea") {
      const total =
        40 + 100 + 140 + 65 +
        40 + 60 + 65 + 45 +
        210 + 650 +
        cbm * 79;

      return {
        country: "Singapore",
        currency: "SGD",
        duty: 0,
        clearance: total,
        delivery: 0,
        total
      };
    }

    alert("Singapore does not support Courier");
    return null;
  }

  /* =====================================================
     MAIN CALCULATE
  ===================================================== */

  function calculate() {
    if (!selectedCustomer) {
      alert("Select customer");
      return;
    }

    const value = Number(form.value || 0);
    const country = selectedCustomer.country;

    let quote = null;

    if (country === "Saudi Arabia") {
      quote = calculateSaudi(value);

    } else if (country === "Qatar") {
      quote = calculateQatar(value);

    } else if (country === "Singapore") {
      quote = calculateSingapore(value);

    } else if (country === "Australia") {

      /* ✅ USING EXACT V2 ENGINE */
      quote = calculateAustraliaExact({
        value,
        weight: Number(form.weight || 0),
        cbm: Number(form.cbm || 0),
        transport: form.transport,
        customerName: selectedCustomer.name
      });

    } else {
      quote = {
        country,
        currency: "GBP",
        duty: 0,
        clearance: 0,
        delivery: 0,
        total: 0
      };
    }

    if (quote) setResult(quote);
  }

  /* =====================================================
     SAVE
  ===================================================== */

  async function saveQuote() {
    if (!result || !selectedCustomer) return;

    await addDoc(collection(db, "quotes"), {
      customerId: form.customerId,
      customerName: selectedCustomer.name,
      country: result.country,
      value: Number(form.value),
      weight: Number(form.weight),
      pieces: Number(form.pieces),
      cbm: Number(form.cbm),
      transport: form.transport,
      zone: result.zone || "",
      duty: result.duty,
      clearance: result.clearance,
      delivery: result.delivery,
      total: result.total,
      currency: result.currency,
      createdAt: serverTimestamp()
    });

    alert("Quote Saved");
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Quote Engine
        </h1>

        <div className="grid md:grid-cols-2 gap-8">

          {/* FORM */}
          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            <select
              className="w-full p-3 rounded-xl bg-zinc-800"
              value={form.customerId}
              onChange={e => selectCustomer(e.target.value)}
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="Goods Value"
              onChange={e => update("value", e.target.value)}
            />

            <input
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="Weight"
              onChange={e => update("weight", e.target.value)}
            />

            <input
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="CBM"
              onChange={e => update("cbm", e.target.value)}
            />

            <select
              className="w-full p-3 bg-zinc-800 rounded-xl"
              onChange={e => update("transport", e.target.value)}
            >
              <option>Courier</option>
              <option>Air</option>
              <option>Sea</option>
            </select>

            <button
              onClick={calculate}
              className="w-full bg-fuchsia-700 p-3 rounded-xl"
            >
              Calculate Quote
            </button>
          </div>

          {/* RESULT */}
          <div className="bg-zinc-900 p-6 rounded-2xl">

            {!result && (
              <div className="text-zinc-400">
                Enter values to calculate
              </div>
            )}

            {result && (
              <div className="space-y-3">

                <div className="text-sm text-zinc-400">
                  {selectedCustomer.name}
                </div>

                <div>Country: {result.country}</div>

                {result.zone && (
                  <div>Zone: {result.zone}</div>
                )}

                <Row label="Duty" value={result.duty} />
                <Row label="Clearance" value={result.clearance} />
                <Row label="Delivery" value={result.delivery} />

                <div className="text-3xl font-bold text-fuchsia-500 pt-4 border-t border-zinc-800">
                  {result.currency} {result.total.toFixed(2)}
                </div>

                <button
                  onClick={saveQuote}
                  className="w-full bg-green-600 p-3 rounded-xl"
                >
                  Save Quote
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-zinc-800 pb-2">
      <span>{label}</span>
      <span>{Number(value || 0).toFixed(2)}</span>
    </div>
  );
}
