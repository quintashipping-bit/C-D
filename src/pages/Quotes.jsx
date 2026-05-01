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
    const snap = await getDocs(
      collection(db, "customers")
    );

    const data = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    setCustomers(data);
  }

  async function loadSettings() {
    const saudiSnap = await getDoc(
      doc(db, "settings", "saudi")
    );

    const qatarSnap = await getDoc(
      doc(db, "settings", "qatar")
    );

    const singaporeSnap = await getDoc(
      doc(db, "settings", "singapore")
    );

    setSettings({
      saudi: saudiSnap.exists()
        ? saudiSnap.data()
        : null,

      qatar: qatarSnap.exists()
        ? qatarSnap.data()
        : null,

      singapore: singaporeSnap.exists()
        ? singaporeSnap.data()
        : null
    });
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

  /* =====================================================
     AUSTRALIA LOOKUPS
  ===================================================== */

  function getAustraliaZone(name) {
    const zones = {
      "AGL MACQUARIE GENERATION": "NN1",
      "AGL TORRENS ISLAND POWER": "SS1",
      "AMPOL LYTTON REFINERY": "Q01",
      "ARROW ENERGY": "Q04",
      "BEACH ENERGY": "VV1",
      "BHP BILLITON - OLYMPIC DAM": "SS1",
      "BLUEWATERS POWER STATION": "VV2",
      "CEMENT AUSTRALIA (TARONG)": "Q01",
      "CS ENERGY (CALLIDE DAM)": "Q04",
      "CS ENERGY KOGAN CREEK": "Q01",
      "DIAMANTINA POWER": "Q04",
      "ENERGYAUSTRALIA (YALLOURN)": "VV2",
      "ENGIE HAZELWOOD": "VV1",
      "GLENCORE (MOUNT ISA)": "Q04",
      "NRG GLADSTONE": "Q02",
      "RIO TINTO ALUMINIUM YARWUN": "Q02",
      "YARA PILBARA FERTILISERS": "VV1"
    };

    return (
      zones[name?.toUpperCase()] ||
      "Q01"
    );
  }

  function getAustraliaDelivery(
    zone,
    weight
  ) {
    const table = {
      Q01: {
        base: 17.91,
        perKg: 0.4158
      },
      Q02: {
        base: 23.39,
        perKg: 0.8997
      },
      Q04: {
        base: 26.39,
        perKg: 1.7196
      },
      SS1: {
        base: 48.52,
        perKg: 2.1312
      },
      NN1: {
        base: 60.07,
        perKg: 2.8069
      },
      VV1: {
        base: 77.40,
        perKg: 4.6782
      },
      VV2: {
        base: 104.37,
        perKg: 28.3106
      }
    };

    const row =
      table[zone] ||
      table.Q01;

    return (
      row.base +
      weight * row.perKg
    );
  }

  /* =====================================================
     SAUDI
  ===================================================== */

  function calculateSaudi(value) {
    const dutyRate =
      Number(
        settings.saudi?.dutyRate ||
        0.05
      );

    const percentage =
      Number(
        settings.saudi?.percentage ||
        0.003464
      );

    const min =
      Number(
        settings.saudi?.minMerchandise ||
        27.75
      );

    const max =
      Number(
        settings.saudi?.maxMerchandise ||
        538.4
      );

    const taxPaid =
      Number(
        settings.saudi?.taxPaidFee ||
        25
      );

    const duty =
      value * dutyRate;

    let clearance =
      value * percentage;

    if (clearance < min)
      clearance = min;

    if (clearance > max)
      clearance = max;

    const total =
      duty +
      clearance +
      taxPaid;

    return {
      country:
        "Saudi Arabia",
      currency: "GBP",
      duty,
      clearance,
      delivery: taxPaid,
      total
    };
  }

  /* =====================================================
     QATAR
  ===================================================== */

  function calculateQatar(value) {
    const dutyRate =
      Number(
        settings.qatar?.dutyRate ||
        0.05
      );

    const fx =
      Number(
        settings.qatar?.fxRate ||
        4.65
      );

    const duty =
      value * dutyRate;

    const qarValue =
      value * fx;

    let legal = 0;

    if (qarValue <= 15000)
      legal = 650;
    else if (
      qarValue <= 100000
    )
      legal = 1150;
    else if (
      qarValue <= 250000
    )
      legal = 2650;
    else if (
      qarValue <= 1000000
    )
      legal = 5150;
    else
      legal =
        qarValue * 0.006;

    return {
      country: "Qatar",
      currency: "QAR",
      duty,
      clearance: legal,
      delivery: 0,
      total:
        duty + legal
    };
  }

  /* =====================================================
     SINGAPORE
  ===================================================== */

  function calculateSingapore(
    value
  ) {
    const cbm =
      Number(
        form.cbm || 0
      );

    if (
      form.transport ===
      "Courier"
    ) {
      alert(
        "Singapore uses Air or Sea only."
      );
      return null;
    }

    if (
      form.transport ===
      "Air"
    ) {
      const terminal =
        Number(
          settings
            .singapore
            ?.terminalRate ||
            0.15
        );

      const agency =
        Number(
          settings
            .singapore
            ?.agencyRate ||
            0.10
        );

      const total =
        35 +
        15 +
        210 +
        65 +
        value *
          terminal +
        value *
          agency;

      return {
        country:
          "Singapore",
        currency:
          "SGD",
        duty: 0,
        clearance:
          total,
        delivery: 0,
        total
      };
    }

    if (
      form.transport ===
      "Sea"
    ) {
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
        cbm * 79;

      return {
        country:
          "Singapore",
        currency:
          "SGD",
        duty: 0,
        clearance:
          total,
        delivery: 0,
        total
      };
    }

    return null;
  }

  /* =====================================================
     AUSTRALIA
  ===================================================== */

  function calculateAustralia(
    value
  ) {
    const weight =
      Number(
        form.weight || 0
      );

    const cbm =
      Number(
        form.cbm || 0
      );

    const zone =
      getAustraliaZone(
        selectedCustomer.name
      );

    const duty =
      value * 0.05;

    const gst =
      (value + duty) *
      0.10;

    const local =
      getAustraliaDelivery(
        zone,
        weight
      );

    if (
      form.transport ===
      "Courier"
    ) {
      const clearance =
        190 +
        88 +
        value * 0.03;

      const total =
        clearance +
        duty +
        gst +
        local;

      return {
        country:
          "Australia",
        currency:
          "AUD",
        zone,
        duty,
        clearance,
        delivery:
          local,
        total
      };
    }

    if (
      form.transport ===
      "Air"
    ) {
      const clearance =
        201 +
        90 +
        152 +
        80 +
        130 +
        10 +
        20 +
        45 +
        85;

      const total =
        clearance +
        duty +
        gst +
        local;

      return {
        country:
          "Australia",
        currency:
          "AUD",
        zone,
        duty,
        clearance,
        delivery:
          local,
        total
      };
    }

    if (
      form.transport ===
      "Sea"
    ) {
      const clearance =
        95 +
        20 +
        50 +
        45 +
        25 +
        125 +
        45 +
        49 +
        cbm * 20;

      const total =
        clearance +
        duty +
        gst +
        local;

      return {
        country:
          "Australia",
        currency:
          "AUD",
        zone,
        duty,
        clearance,
        delivery:
          local,
        total
      };
    }

    return null;
  }

  /* =====================================================
     MAIN CALCULATE
  ===================================================== */

  function calculate() {
    if (
      !selectedCustomer
    ) {
      alert(
        "Select customer"
      );
      return;
    }

    const value =
      Number(
        form.value || 0
      );

    const country =
      selectedCustomer.country;

    let quote =
      null;

    if (
      country ===
      "Saudi Arabia"
    ) {
      quote =
        calculateSaudi(
          value
        );

    } else if (
      country ===
      "Qatar"
    ) {
      quote =
        calculateQatar(
          value
        );

    } else if (
      country ===
      "Singapore"
    ) {
      quote =
        calculateSingapore(
          value
        );

    } else if (
      country ===
      "Australia"
    ) {
      quote =
        calculateAustralia(
          value
        );

    } else {
      quote = {
        country,
        currency:
          "GBP",
        duty: 0,
        clearance: 0,
        delivery: 0,
        total: 0
      };
    }

    if (quote)
      setResult(
        quote
      );
  }

  /* =====================================================
     SAVE
  ===================================================== */

  async function saveQuote() {
    if (
      !result ||
      !selectedCustomer
    )
      return;

    await addDoc(
      collection(
        db,
        "quotes"
      ),
      {
        customerId:
          form.customerId,
        customerName:
          selectedCustomer.name,
        country:
          result.country,
        value:
          Number(
            form.value
          ),
        weight:
          Number(
            form.weight
          ),
        pieces:
          Number(
            form.pieces
          ),
        cbm:
          Number(
            form.cbm
          ),
        transport:
          form.transport,
        zone:
          result.zone ||
          "",
        duty:
          result.duty,
        clearance:
          result.clearance,
        delivery:
          result.delivery,
        total:
          result.total,
        currency:
          result.currency,
        createdAt:
          serverTimestamp()
      }
    );

    alert(
      "Quote Saved"
    );
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
              value={
                form.customerId
              }
              onChange={e =>
                selectCustomer(
                  e.target.value
                )
              }
            >
              <option value="">
                Select Customer
              </option>

              {customers.map(
                c => (
                  <option
                    key={
                      c.id
                    }
                    value={
                      c.id
                    }
                  >
                    {
                      c.name
                    }
                  </option>
                )
              )}
            </select>

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Goods Value"
              value={
                form.value
              }
              onChange={e =>
                update(
                  "value",
                  e.target.value
                )
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Weight"
              value={
                form.weight
              }
              onChange={e =>
                update(
                  "weight",
                  e.target.value
                )
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Pieces"
              value={
                form.pieces
              }
              onChange={e =>
                update(
                  "pieces",
                  e.target.value
                )
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="CBM"
              value={
                form.cbm
              }
              onChange={e =>
                update(
                  "cbm",
                  e.target.value
                )
              }
            />

            <select
              className="w-full p-3 rounded-xl bg-zinc-800"
              value={
                form.transport
              }
              onChange={e =>
                update(
                  "transport",
                  e.target.value
                )
              }
            >
              <option>
                Courier
              </option>
              <option>
                Air
              </option>
              <option>
                Sea
              </option>
            </select>

            <button
              onClick={
                calculate
              }
              className="w-full bg-fuchsia-700 p-3 rounded-xl"
            >
              Calculate Quote
            </button>

          </div>

          {/* RESULT */}

          <div className="bg-zinc-900 p-6 rounded-2xl">

            {!result && (
              <div className="text-zinc-400">
                Enter values
                to
                calculate.
              </div>
            )}

            {result && (
              <div className="space-y-3">

                <div className="text-zinc-400 text-sm">
                  {
                    selectedCustomer.name
                  }
                </div>

                <div>
                  Country:
                  {" "}
                  {
                    result.country
                  }
                </div>

                {result.zone && (
                  <div>
                    Zone:
                    {" "}
                    {
                      result.zone
                    }
                  </div>
                )}

                <Row
                  label="Duty"
                  value={
                    result.duty
                  }
                />

                <Row
                  label="Clearance"
                  value={
                    result.clearance
                  }
                />

                <Row
                  label="Delivery"
                  value={
                    result.delivery
                  }
                />

                <div className="border-t border-zinc-800 pt-4 text-3xl font-bold text-fuchsia-500">
                  {
                    result.currency
                  }{" "}
                  {Number(
                    result.total
                  ).toFixed(
                    2
                  )}
                </div>

                <button
                  onClick={
                    saveQuote
                  }
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
        {Number(
          value || 0
        ).toFixed(2)}
      </span>
    </div>
  );
}
