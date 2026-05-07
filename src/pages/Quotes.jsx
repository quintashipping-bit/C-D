import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/config";

import Sidebar from "../components/Sidebar";

/* =========================================================
   LOGIC ENGINES
========================================================= */

import { calculateAustralia } from "../logic/australia";

import { calculateSouthAfrica } from "../logic/southAfricaLogic";

import { calculateSaudi } from "../logic/saudi";

import { calculateQatar } from "../logic/qatar";

import { calculateSingapore } from "../logic/singapore";

/* =========================================================
   COMPONENT
========================================================= */

export default function Quotes() {
  const [customers, setCustomers] = useState([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [result, setResult] =
    useState(null);

  const [form, setForm] = useState({
    customerId: "",

    value: "",

    weight: "",

    pieces: "",

    cbm: "",

    transport: "Air"
  });

  /* =====================================================
     LOAD CUSTOMERS
  ===================================================== */

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const snap =
      await getDocs(
        collection(db, "customers")
      );

    const rows =
      snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    setCustomers(rows);
  }

  /* =====================================================
     UPDATE FORM
  ===================================================== */

  function update(name, value) {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  /* =====================================================
     SELECT CUSTOMER
  ===================================================== */

  function selectCustomer(id) {
    const customer =
      customers.find(c => c.id === id);

    setSelectedCustomer(customer || null);

    setForm(prev => ({
      ...prev,
      customerId: id
    }));

    setResult(null);
  }

  /* =====================================================
     MAIN CALCULATE
  ===================================================== */

  function calculate() {
    if (!selectedCustomer) {
      alert("Please select customer");
      return;
    }

    const payload = {
      value:
        Number(form.value || 0),

      weight:
        Number(form.weight || 0),

      pieces:
        Number(form.pieces || 0),

      cbm:
        Number(form.cbm || 0),

      transport:
        form.transport,

      customerName:
        selectedCustomer.name
    };

    const country =
      selectedCustomer.country
        ?.trim()
        ?.toUpperCase();

    let quote = null;

    /* ===================================================
       ROUTING
    =================================================== */

    switch (country) {

      case "AUSTRALIA":
        quote =
          calculateAustralia(payload);
        break;

      case "SOUTH AFRICA":
        quote =
          calculateSouthAfrica(payload);
        break;

      case "SAUDI ARABIA":
        quote =
          calculateSaudi(payload);
        break;

      case "QATAR":
        quote =
          calculateQatar(payload);
        break;

      case "SINGAPORE":
        quote =
          calculateSingapore(payload);
        break;

      default:
        quote = {
          country,

          currency: "GBP",

          duty: 0,

          clearance: 0,

          delivery: 0,

          total: 0,

          error:
            "No engine configured"
        };
    }

    setResult(quote);
  }

  /* =====================================================
     SAVE QUOTE
  ===================================================== */

  async function saveQuote() {
    if (!result || !selectedCustomer) {
      return;
    }

    await addDoc(
      collection(db, "quotes"),
      {
        customerId:
          selectedCustomer.id,

        customerName:
          selectedCustomer.name,

        country:
          result.country,

        transport:
          form.transport,

        value:
          Number(form.value || 0),

        weight:
          Number(form.weight || 0),

        pieces:
          Number(form.pieces || 0),

        cbm:
          Number(form.cbm || 0),

        zone:
          result.zone || "",

        duty:
          Number(result.duty || 0),

        clearance:
          Number(result.clearance || 0),

        delivery:
          Number(result.delivery || 0),

        total:
          Number(result.total || 0),

        currency:
          result.currency || "GBP",

        breakdown:
          result.breakdown || {},

        createdAt:
          serverTimestamp()
      }
    );

    alert("Quote Saved");
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Quote Engine
        </h1>

        <div className="grid md:grid-cols-2 gap-8">

          {/* =================================================
              FORM
          ================================================= */}

          <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">

            <select
              value={form.customerId}
              onChange={e =>
                selectCustomer(e.target.value)
              }
              className="w-full p-3 rounded-xl bg-zinc-800"
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

            <input
              type="number"
              placeholder="Goods Value"
              value={form.value}
              onChange={e =>
                update(
                  "value",
                  e.target.value
                )
              }
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input
              type="number"
              placeholder="Weight"
              value={form.weight}
              onChange={e =>
                update(
                  "weight",
                  e.target.value
                )
              }
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input
              type="number"
              placeholder="Pieces"
              value={form.pieces}
              onChange={e =>
                update(
                  "pieces",
                  e.target.value
                )
              }
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <input
              type="number"
              placeholder="CBM"
              value={form.cbm}
              onChange={e =>
                update(
                  "cbm",
                  e.target.value
                )
              }
              className="w-full p-3 rounded-xl bg-zinc-800"
            />

            <select
              value={form.transport}
              onChange={e =>
                update(
                  "transport",
                  e.target.value
                )
              }
              className="w-full p-3 rounded-xl bg-zinc-800"
            >
              <option value="Air">
                Air
              </option>

              <option value="Sea">
                Sea
              </option>

              <option value="Courier">
                Courier
              </option>
            </select>

            <button
              onClick={calculate}
              className="w-full p-3 rounded-xl bg-fuchsia-700 hover:bg-fuchsia-600"
            >
              Calculate Quote
            </button>

          </div>

          {/* =================================================
              RESULT
          ================================================= */}

          <div className="bg-zinc-900 rounded-2xl p-6">

            {!result && (
              <div className="text-zinc-400">
                Enter values to calculate
              </div>
            )}

            {result && (

              <div className="space-y-4">

                <div>

                  <div className="text-zinc-400 text-sm">
                    Customer
                  </div>

                  <div className="font-semibold">
                    {selectedCustomer?.name}
                  </div>

                </div>

                <div>

                  <div className="text-zinc-400 text-sm">
                    Country
                  </div>

                  <div>
                    {result.country}
                  </div>

                </div>

                {result.transport && (
                  <div>

                    <div className="text-zinc-400 text-sm">
                      Transport
                    </div>

                    <div>
                      {result.transport}
                    </div>

                  </div>
                )}

                {result.zone !== null &&
                  result.zone !== undefined && (
                  <div>

                    <div className="text-zinc-400 text-sm">
                      Zone
                    </div>

                    <div>
                      {result.zone}
                    </div>

                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 space-y-2">

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

                </div>

                <div className="border-t border-zinc-800 pt-4">

                  <div className="text-zinc-400 text-sm">
                    Total
                  </div>

                  <div className="text-4xl font-bold text-fuchsia-500">
                    {result.currency}{" "}
                    {Number(
                      result.total || 0
                    ).toFixed(2)}
                  </div>

                </div>

                {result.error && (
                  <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-xl">
                    {result.error}
                  </div>
                )}

                <button
                  onClick={saveQuote}
                  className="w-full p-3 rounded-xl bg-green-600 hover:bg-green-500"
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

/* =========================================================
   ROW COMPONENT
========================================================= */

function Row({
  label,
  value
}) {
  return (
    <div className="flex justify-between border-b border-zinc-800 pb-2">

      <span>
        {label}
      </span>

      <span>
        {Number(value || 0).toFixed(2)}
      </span>

    </div>
  );
}
