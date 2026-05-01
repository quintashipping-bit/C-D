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
  const [countries, setCountries] = useState([]);

  const [form, setForm] = useState({
    customerId: "",
    country: "",
    shipment: "Air",
    weight: "",
    value: "",
    margin: "10"
  });

  const [result, setResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const custSnap = await getDocs(collection(db, "customers"));
    const countrySnap = await getDocs(collection(db, "countries"));

    setCustomers(
      custSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    );

    setCountries(
      countrySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    );
  }

  function update(name, value) {
    setForm({ ...form, [name]: value });
  }

  function calculate() {
    const value = Number(form.value || 0);
    const weight = Number(form.weight || 0);
    const margin = Number(form.margin || 0);

    const freight = weight * 4;
    const clearance = 25;
    const duty = value * 0.05;
    const subtotal = freight + clearance + duty + value;
    const profit = subtotal * (margin / 100);
    const total = subtotal + profit;

    setResult({
      freight,
      clearance,
      duty,
      subtotal,
      profit,
      total
    });
  }

  async function saveQuote() {
    if (!result) return;

    await addDoc(collection(db, "quotes"), {
      ...form,
      ...result,
      createdAt: serverTimestamp(),
      status: "draft"
    });

    alert("Quote saved");
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Quote Engine
        </h1>

        <div className="grid md:grid-cols-2 gap-8">

          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            <select
              className="w-full p-3 rounded bg-zinc-800"
              onChange={e => update("customerId", e.target.value)}
            >
              <option value="">Select Customer</option>

              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-3 rounded bg-zinc-800"
              onChange={e => update("country", e.target.value)}
            >
              <option value="">Destination Country</option>

              {countries.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="w-full p-3 rounded bg-zinc-800"
              value={form.shipment}
              onChange={e => update("shipment", e.target.value)}
            >
              <option>Air</option>
              <option>Sea</option>
              <option>Road</option>
              <option>Courier</option>
            </select>

            <input
              placeholder="Weight (kg)"
              className="w-full p-3 rounded bg-zinc-800"
              onChange={e => update("weight", e.target.value)}
            />

            <input
              placeholder="Goods Value"
              className="w-full p-3 rounded bg-zinc-800"
              onChange={e => update("value", e.target.value)}
            />

            <input
              placeholder="Margin %"
              className="w-full p-3 rounded bg-zinc-800"
              value={form.margin}
              onChange={e => update("margin", e.target.value)}
            />

            <button
              onClick={calculate}
              className="w-full bg-fuchsia-700 p-3 rounded-xl"
            >
              Calculate Quote
            </button>
          </div>

          <div className="bg-zinc-900 p-6 rounded-2xl">

            {!result && (
              <div className="text-zinc-400">
                Enter values and calculate quote.
              </div>
            )}

            {result && (
              <div className="space-y-3">

                <Row label="Freight" value={result.freight} />
                <Row label="Clearance" value={result.clearance} />
                <Row label="Duty" value={result.duty} />
                <Row label="Subtotal" value={result.subtotal} />
                <Row label="Profit" value={result.profit} />

                <div className="border-t border-zinc-700 pt-3 text-2xl font-bold">
                  Total: {result.total.toFixed(2)}
                </div>

                <button
                  onClick={saveQuote}
                  className="mt-4 w-full bg-green-700 p-3 rounded-xl"
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
      <span>{value.toFixed(2)}</span>
    </div>
  );
}
