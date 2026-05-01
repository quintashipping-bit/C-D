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
    transport: "Courier"
  });

  const [result, setResult] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));

    setCustomers(
      snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    );
  }

  function update(name, value) {
    setForm({ ...form, [name]: value });
  }

  function selectCustomer(id) {
    const customer = customers.find(c => c.id === id) || null;

    setSelectedCustomer(customer);
    setForm({
      ...form,
      customerId: id
    });

    setResult(null);
  }

  function getRules(country) {
    switch (country) {
      case "Saudi Arabia":
        return {
          currency: "GBP",
          dutyRate: 0.05,
          clearance: 40,
          delivery: 35
        };

      case "Qatar":
        return {
          currency: "GBP",
          dutyRate: 0.05,
          clearance: 35,
          delivery: 30
        };

      case "Singapore":
        return {
          currency: "SGD",
          dutyRate: 0,
          clearance: 45,
          delivery: 40
        };

      default:
        return {
          currency: "GBP",
          dutyRate: 0,
          clearance: 0,
          delivery: 0
        };
    }
  }

  function calculate() {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    const country = selectedCustomer.country;
    const value = Number(form.value || 0);

    const rules = getRules(country);

    const duty = value * rules.dutyRate;

    const total =
      duty +
      rules.clearance +
      rules.delivery;

    setResult({
      country,
      currency: rules.currency,
      duty,
      clearance: rules.clearance,
      delivery: rules.delivery,
      total
    });
  }

  async function saveQuote() {
    if (!result || !selectedCustomer) return;

    await addDoc(collection(db, "quotes"), {
      customerId: form.customerId,
      customerName: selectedCustomer.name,
      country: selectedCustomer.country,
      value: Number(form.value),
      weight: Number(form.weight),
      pieces: Number(form.pieces),
      transport: form.transport,
      ...result,
      createdAt: serverTimestamp(),
      status: "draft"
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

          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            <select
              className="w-full p-3 rounded bg-zinc-800"
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

            {selectedCustomer && (
              <div className="bg-zinc-800 rounded p-3 text-sm">
                Destination Country:{" "}
                <span className="text-fuchsia-400 font-semibold">
                  {selectedCustomer.country}
                </span>
              </div>
            )}

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="Goods Value"
              value={form.value}
              onChange={e => update("value", e.target.value)}
            />

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="Weight"
              value={form.weight}
              onChange={e => update("weight", e.target.value)}
            />

            <input
              className="w-full p-3 rounded bg-zinc-800"
              placeholder="Pieces"
              value={form.pieces}
              onChange={e => update("pieces", e.target.value)}
            />

            <select
              className="w-full p-3 rounded bg-zinc-800"
              value={form.transport}
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

          <div className="bg-zinc-900 p-6 rounded-2xl">

            {!result && (
              <div className="text-zinc-400">
                Select customer and enter values.
              </div>
            )}

            {result && (
              <div className="space-y-3">

                <div className="text-sm text-zinc-400">
                  {selectedCustomer.name} / {result.country}
                </div>

                <Row label="Duty" value={result.duty} />
                <Row label="Clearance" value={result.clearance} />
                <Row label="Delivery" value={result.delivery} />

                <div className="border-t pt-4 text-3xl font-bold text-fuchsia-500">
                  {result.currency} {result.total.toFixed(2)}
                </div>

                <button
                  onClick={saveQuote}
                  className="w-full bg-green-700 p-3 rounded-xl"
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
      <span>{Number(value).toFixed(2)}</span>
    </div>
  );
}
