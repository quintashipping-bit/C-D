import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

export default function Quotes() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

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
  }, []);

  async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));

    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setCustomers(data);
  }

  function update(name, value) {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function selectCustomer(id) {
    const customer =
      customers.find(c => c.id === id) || null;

    setSelectedCustomer(customer);

    setForm(prev => ({
      ...prev,
      customerId: id
    }));

    setResult(null);
  }

  /* ---------------- SAUDI ---------------- */

  function calculateSaudiCourier(value) {
    const duty = value * 0.05;

    let merchandise = value * 0.003464;

    if (merchandise < 27.75) merchandise = 27.75;
    if (merchandise > 538.4) merchandise = 538.4;

    const dutyTaxPaidFee = 25;

    const total =
      duty +
      merchandise +
      dutyTaxPaidFee;

    return {
      country: "Saudi Arabia",
      currency: "GBP",
      duty,
      clearance: merchandise,
      delivery: dutyTaxPaidFee,
      total
    };
  }

  /* ---------------- QATAR ---------------- */

  function calculateQatarCourier(value) {
    const duty = value * 0.05;

    const fxRate = 4.65;
    const qatarValue = value * fxRate;

    let legalisation = 0;

    if (qatarValue <= 15000) legalisation = 650;
    else if (qatarValue <= 100000) legalisation = 1150;
    else if (qatarValue <= 250000) legalisation = 2650;
    else if (qatarValue <= 1000000) legalisation = 5150;
    else legalisation = qatarValue * 0.006;

    const total =
      duty +
      legalisation;

    return {
      country: "Qatar",
      currency: "QAR",
      duty,
      clearance: legalisation,
      delivery: 0,
      total
    };
  }

  /* ---------------- SINGAPORE ---------------- */

  function calculateSingapore(value) {
    const cbm = Number(form.cbm || 0);

    if (form.transport === "Courier") {
      alert(
        "Singapore courier is not standard. Use Air or Sea."
      );
      return null;
    }

    if (form.transport === "Air") {
      const documentation = 35;
      const customs = 15;
      const transport = 210;
      const labour = 65;

      const terminal = value * 0.15;
      const agency = value * 0.10;

      const total =
        documentation +
        customs +
        transport +
        labour +
        terminal +
        agency;

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
        40 +
        100 +
        140 +
        65 +
        40 +
        60 +
        65 +
        45 +
        210 +
        650 +
        (20 * cbm) +
        (59 * cbm);

      return {
        country: "Singapore",
        currency: "SGD",
        duty: 0,
        clearance: total,
        delivery: 0,
        total
      };
    }

    return null;
  }

  /* ---------------- DEFAULT ---------------- */

  function calculateDefault(country) {
    return {
      country,
      currency: "GBP",
      duty: 0,
      clearance: 0,
      delivery: 0,
      total: 0
    };
  }

  /* ---------------- MAIN CALCULATOR ---------------- */

  function calculate() {
    if (!selectedCustomer) {
      alert("Please select customer");
      return;
    }

    const value = Number(form.value || 0);
    const country = selectedCustomer.country;

    let quote;

    if (
      country === "Saudi Arabia" &&
      form.transport === "Courier"
    ) {
      quote = calculateSaudiCourier(value);

    } else if (
      country === "Qatar" &&
      form.transport === "Courier"
    ) {
      quote = calculateQatarCourier(value);

    } else if (
      country === "Qatar" &&
      form.transport !== "Courier"
    ) {
      alert("Qatar only offers Courier");
      return;

    } else if (country === "Singapore") {
      quote = calculateSingapore(value);

      if (!quote) return;

    } else {
      quote = calculateDefault(country);
    }

    setResult(quote);
  }

  /* ---------------- SAVE ---------------- */

  async function saveQuote() {
    if (!result || !selectedCustomer) return;

    await addDoc(collection(db, "quotes"), {
      customerId: form.customerId,
      customerName: selectedCustomer.name,
      country: selectedCustomer.country,

      value: Number(form.value || 0),
      weight: Number(form.weight || 0),
      pieces: Number(form.pieces || 0),
      cbm: Number(form.cbm || 0),
      transport: form.transport,

      duty: result.duty,
      clearance: result.clearance,
      delivery: result.delivery,
      total: result.total,
      currency: result.currency,

      status: "draft",
      createdAt: serverTimestamp()
    });

    alert("Quote Saved");
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Quote Engine
        </h1>

        <div className="grid md:grid-cols-2 gap-8">

          {/* LEFT PANEL */}

          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            <select
              className="w-full p-3 rounded-xl bg-zinc-800"
              value={form.customerId}
              onChange={e =>
                selectCustomer(e.target.value)
              }
            >
              <option value="">
                Select Customer
              </option>

              {customers.map(c => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div className="bg-zinc-800 p-3 rounded-xl text-sm">
                Destination:{" "}
                <span className="text-fuchsia-400 font-semibold">
                  {selectedCustomer.country}
                </span>
              </div>
            )}

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Goods Value"
              value={form.value}
              onChange={e =>
                update("value", e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Weight"
              value={form.weight}
              onChange={e =>
                update("weight", e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Pieces"
              value={form.pieces}
              onChange={e =>
                update("pieces", e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="CBM (Sea only)"
              value={form.cbm}
              onChange={e =>
                update("cbm", e.target.value)
              }
            />

            <select
              className="w-full p-3 rounded-xl bg-zinc-800"
              value={form.transport}
              onChange={e =>
                update("transport", e.target.value)
              }
            >
              <option>Courier</option>
              <option>Air</option>
              <option>Sea</option>
            </select>

            <button
              onClick={calculate}
              className="w-full bg-fuchsia-700 hover:bg-fuchsia-800 p-3 rounded-xl"
            >
              Calculate Quote
            </button>

          </div>

          {/* RIGHT PANEL */}

          <div className="bg-zinc-900 p-6 rounded-2xl">

            {!result && (
              <div className="text-zinc-400">
                Enter values to calculate quote.
              </div>
            )}

            {result && (
              <div className="space-y-3">

                <div className="text-sm text-zinc-400">
                  {selectedCustomer.name} /{" "}
                  {result.country}
                </div>

                <Row
                  label="Duty"
                  value={result.duty}
                />

                <Row
                  label="Clearance"
                  value={result.clearance}
                />

                <Row
                  label="Delivery"
                  value={result.delivery}
                />

                <div className="border-t border-zinc-800 pt-4 text-3xl font-bold text-fuchsia-500">
                  {result.currency}{" "}
                  {Number(result.total).toFixed(2)}
                </div>

                <button
                  onClick={saveQuote}
                  className="w-full bg-green-700 hover:bg-green-800 p-3 rounded-xl"
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
      <span>
        {Number(value || 0).toFixed(2)}
      </span>
    </div>
  );
}
