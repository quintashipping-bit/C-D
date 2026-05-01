/* ==========================================================
CREATE FILE:

src/logic/australia.js

FULL AUSTRALIA EXACT V2 ENGINE
========================================================== */

export function calculateAustraliaExact({
  value,
  weight,
  cbm,
  transport,
  customerName
}) {

  /* ======================================================
     CUSTOMER → ZONE
  ====================================================== */

  const customerZones = {
    "AGL MACQUARIE GENERATION": "NN1",
    "AGL TORRENS ISLAND POWER": "SS1",
    "AMPOL LYTTON REFINERY": "Q01",
    "ARROW ENERGY": "Q04",
    "BEACH ENERGY": "VV1",
    "BHP BILLITON - OLYMPIC DAM": "SS1",
    "BLUEWATERS POWER STATION": "VV2",
    "CS ENERGY KOGAN CREEK": "Q01",
    "GLENCORE (MOUNT ISA)": "Q04",
    "RIO TINTO ALUMINIUM YARWUN": "Q02",
    "YARA PILBARA FERTILISERS": "VV1"
  };

  const zone =
    customerZones[
      customerName?.toUpperCase()
    ] || "Q01";


  /* ======================================================
     LOCAL DELIVERY TABLES
  ====================================================== */

  const deliveryTable = {
    Q01: {
      base5: 17.91,
      kg5: 0.4158,
      base20: 23.99,
      kg20: 5.998
    },

    Q02: {
      base5: 23.39,
      kg5: 0.8997,
      base20: 26.99,
      kg20: 7.1976
    },

    Q04: {
      base5: 26.39,
      kg5: 1.7196,
      base20: 29.99,
      kg20: 10.7964
    },

    SS1: {
      base5: 48.52,
      kg5: 2.1312,
      base20: 53.98,
      kg20: 16.1946
    },

    NN1: {
      base5: 60.07,
      kg5: 2.8069,
      base20: 56.98,
      kg20: 17.3942
    },

    VV1: {
      base5: 77.40,
      kg5: 4.6782,
      base20: 74.98,
      kg20: 25.1916
    },

    VV2: {
      base5: 104.37,
      kg5: 28.3106,
      base20: 149.95,
      kg20: 28.1906
    }
  };

  const row =
    deliveryTable[zone] ||
    deliveryTable.Q01;

  const fuel = 0.406;

  /* ======================================================
     TNT / TRUCK DECISION ENGINE
  ====================================================== */

  function localDelivery() {

    /* 5kg model */
    const extra5 =
      Math.max(weight - 5, 0);

    const total5 =
      row.base5 +
      extra5 * row.kg5;

    const total5Fuel =
      total5 +
      total5 * fuel;

    /* 20kg model */
    const extra20 =
      Math.max(weight - 20, 0);

    const total20 =
      row.base20 +
      extra20 * row.kg20;

    const total20Fuel =
      total20 +
      total20 * fuel;

    return Math.min(
      total5Fuel,
      total20Fuel
    );
  }

  const delivery =
    localDelivery();


  /* ======================================================
     DUTY + GST
  ====================================================== */

  const duty =
    value * 0.05;

  const gst =
    (value + duty) * 0.10;


  /* ======================================================
     COURIER
  ====================================================== */

  if (
    transport === "Courier"
  ) {

    let abf = 0;

    if (value > 1000)
      abf = 88;

    if (value > 9999)
      abf = 190;

    const disbursement =
      Math.max(
        value * 0.03,
        20
      );

    const clearance =
      abf +
      disbursement;

    const total =
      clearance +
      duty +
      gst +
      delivery;

    return {
      country:
        "Australia",
      currency:
        "AUD",
      zone,
      duty,
      gst,
      clearance,
      delivery,
      total
    };
  }


  /* ======================================================
     AIR
  ====================================================== */

  if (
    transport === "Air"
  ) {

    const entry =
      value > 1000
        ? 201
        : 90;

    const declaration =
      value > 1000
        ? 152
        : 50;

    const cargo =
      Math.max(
        weight * 0.65,
        65
      );

    const terminal =
      Math.max(
        weight * 0.175,
        80
      );

    const clearance =
      entry +
      declaration +
      49 +
      80 +
      130 +
      10 +
      20 +
      cargo +
      terminal +
      45 +
      85;

    const total =
      clearance +
      duty +
      gst +
      delivery;

    return {
      country:
        "Australia",
      currency:
        "AUD",
      zone,
      duty,
      gst,
      clearance,
      delivery,
      total
    };
  }


  /* ======================================================
     SEA
  ====================================================== */

  if (
    transport === "Sea"
  ) {

    const port =
      Math.max(
        cbm * 95,
        95
      );

    const terminal =
      Math.max(
        cbm * 20,
        20
      );

    const clearance =
      port +
      terminal +
      50 +
      45 +
      25 +
      125 +
      49 +
      49;

    const total =
      clearance +
      duty +
      gst +
      delivery;

    return {
      country:
        "Australia",
      currency:
        "AUD",
      zone,
      duty,
      gst,
      clearance,
      delivery,
      total
    };
  }

  return null;
}
