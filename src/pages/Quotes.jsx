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

/* ================================
   LOGIC ENGINES
================================ */

import { calculateAustralia } from "../logic/australia";
import { calculateSouthAfrica } from "../logic/southAfricaLogic";
import { calculateQatar } from "../logic/qatar";
import { calculateSaudi } from "../logic/saudi";
import { calculateSingapore } from "../logic/singapore";

/* ================================
   CUSTOMER MATRIX
================================ */

import { customerRates } from "../data/customerRates";

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

  /* =========================================
     LOAD DATA
  ========================================= */

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

  /* =========================================
     FORM UPDATE
  ========================================= */

  function update(name, value) {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  /* =========================================
     CUSTOMER SELECT
  ========================================= */

  function selectCustomer(id) {
    const customer = customers.find(c => c.id === id) || null;

    setSelectedCustomer(customer);

    setForm(prev => ({
      ...prev,
      customerId: id
    }));

    setResult(null);
  }

  /* =========================================
     CUSTOMER MATRIX LOOKUP
  ========================================= */

  function getCustomerRate(customerName) {
    if (!customerName) return null;

    return customerRates.find(
      c =>
        c.customer?.trim()?.toLowerCase() ===
        customerName?.trim()?.toLowerCase()
    );
  }

  /* =========================================
     MAIN CALCULATE
  ========================================= */

  function calculate() {
    if (!selectedCustomer) {
      alert("Select customer");
      return;
    }

    const value = Number(form.value || 0);
    const weight = Number(form.weight || 0);
    const pieces = Number(form.pieces || 0);
    const cbm = Number(form.cbm || 0);

    const transport = form.transport;

    const customerName =
      selectedCustomer.name ||
      selectedCustomer.customer ||
      "";

    const country =
      selectedCustomer.country ||
      "";

    const customerRate =
      getCustomerRate(customerName);

    let quote = null;

    /* =====================================
       AUSTRALIA
    ===================================== */

    if (
      country.toUpperCase() === "AUSTRALIA"
    ) {
      quote = calculateAustralia({
        value,
        weight,
        pieces,
        cbm,
        transport,
        customerName,
        customerRate
      });
    }

    /* =====================================
       SOUTH AFRICA
    ===================================== */

    else if (
      country.toUpperCase() === "SOUTH AFRICA"
    ) {
      quote = calculateSouthAfrica({
        value,
        weight,
        pieces,
        cbm,
        transport,
        customerName,
        customerRate
      });
    }

    /* =====================================
       QATAR
    ===================================== */

    else if (
      country.toUpperCase() === "QATAR"
    ) {
      quote = calculateQatar({
        value,
        weight,
        pieces,
        cbm,
        transport,
        customerName,
        customerRate,
        settings: settings.qatar
      });
    }

    /* =====================================
       SAUDI
    ===================================== */

    else if (
      country.toUpperCase() === "SAUDI ARABIA"
    ) {
      quote = calculateSaudi({
        value,
        weight,
        pieces,
        cbm,
        transport,
        customerName,
        customerRate,
        settings: settings.saudi
      });
    }

    /* =====================================
       SINGAPORE
    ===================================== */

    else if (
      country.toUpperCase() === "SINGAPORE"
    ) {
      quote = calculateSingapore({
        value,
        weight,
        pieces,
        cbm,
        transport,
        customerName,
        customerRate,
        settings: settings.singapore
      });
    }

    /* =====================================
       FALLBACK
    ===================================== */

    else {
      quote = {
        country,
        currency: "GBP",
        duty: 0,
        clearance: 0,
        delivery: 0,
        total: 0
      };
    }

    setResult(quote);
  }

  /* =========================================
     SAVE QUOTE
  ========================================= */

  async function saveQuote() {
    if (!result || !selectedCustomer) return;

    await addDoc(collection(db, "quotes"), {
      customerId: form.customerId,

      customerName:
        selectedCustomer.name,

      country:
        result.country,

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

      zone:
        result.zone || "",

      duty:
        result.duty || 0,

      clearance:
        result.clearance || 0,

      delivery:
        result.delivery || 0,

      total:
        result.total || 0,

      currency:
        result.currency || "GBP",

      breakdown:
        result.breakdown || {},

      createdAt:
        serverTimestamp()
    });

    alert("Quote Saved");
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Quote Engine
        </h1>

        <div className="grid md:grid-cols-2 gap-8">

          {/* =========================
              FORM
          ========================= */}

          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            <select
              className="w-full p-3 rounded-xl bg-zinc-800"
              value={form.customerId}
              onChange={e => selectCustomer(e.target.value)}
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
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="Goods Value"
              value={form.value}
              onChange={e =>
                update("value", e.target.value)
              }
            />

            <input
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="Weight"
              value={form.weight}
              onChange={e =>
                update("weight", e.target.value)
              }
            />

            <input
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="Pieces"
              value={form.pieces}
              onChange={e =>
                update("pieces", e.target.value)
              }
            />

            <input
              className="w-full p-3 bg-zinc-800 rounded-xl"
              placeholder="CBM"
              value={form.cbm}
              onChange={e =>
                update("cbm", e.target.value)
              }
            />

            <select
              className="w-full p-3 bg-zinc-800 rounded-xl"
              value={form.transport}
              onChange={e =>
                update("transport", e.target.value)
              }
            >
              <option value="Courier">
                Courier
              </option>

              <option value="Air">
                Air
              </option>

              <option value="Sea">
                Sea
              </option>
            </select>

            <button
              onClick={calculate}
              className="w-full bg-fuchsia-700 hover:bg-fuchsia-800 transition-all p-3 rounded-xl"
            >
              Calculate Quote
            </button>

          </div>

          {/* =========================
              RESULTS
          ========================= */}

          <div className="bg-zinc-900 p-6 rounded-2xl">

            {!result && (
              <div className="text-zinc-400">
                Enter values to calculate
              </div>
            )}

            {result && (
              <div className="space-y-3">

                <div className="text-sm text-zinc-400">
                  {selectedCustomer?.name}
                </div>

                <div>
                  Country: {result.country}
                </div>

                {result.zone && (
                  <div>
                    Zone: {result.zone}
                  </div>
                )}

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

                {/* OPTIONAL BREAKDOWN */}

                {result.breakdown &&
                  Object.entries(result.breakdown).map(
                    ([key, value]) => (
                      <Row
                        key={key}
                        label={key}
                        value={value}
                      />
                    )
                  )}

                <div className="text-3xl font-bold text-fuchsia-500 pt-4 border-t border-zinc-800">
                  {result.currency}{" "}
                  {Number(result.total || 0).toFixed(2)}
                </div>

                <button
                  onClick={saveQuote}
                  className="w-full bg-green-600 hover:bg-green-700 transition-all p-3 rounded-xl"
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

/* =========================================
   RESULT ROW
========================================= */

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
