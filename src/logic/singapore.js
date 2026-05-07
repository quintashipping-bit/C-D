// src/logic/singapore.js

/* =========================================================
   SINGAPORE ENGINE
   EXCEL MIRROR VERSION
========================================================= */

export function calculateSingapore({
  value = 0,
  weight = 0,
  pieces = 0,
  cbm = 0,
  transport = "Air"
}) {
  /* =====================================================
     AIR
  ===================================================== */

  if (transport === "Air") {
    /*
      Excel Air Charges
    */

    const permit = 35;

    const customs = 15;

    const handling = 210;

    const documentation = 65;

    const gst =
      value * 0.15;

    const disbursement =
      value * 0.10;

    /*
      Clearance
    */

    const clearance =
      permit +
      customs +
      handling +
      documentation +
      gst +
      disbursement;

    /*
      Total
    */

    const total =
      clearance;

    return {
      country: "SINGAPORE",

      currency: "SGD",

      transport: "Air",

      zone: null,

      duty: 0,

      clearance,

      delivery: 0,

      total,

      breakdown: {
        permit,

        customs,

        handling,

        documentation,

        gst,

        disbursement
      }
    };
  }

  /* =====================================================
     SEA
  ===================================================== */

  if (transport === "Sea") {
    /*
      Sea fixed charges
    */

    const docs = 40;

    const declaration = 100;

    const terminal = 140;

    const permit = 65;

    const thc = 40;

    const handling = 60;

    const deliveryOrder = 65;

    const customs = 45;

    const destination = 210;

    const transportCharge = 650;

    /*
      CBM Charge
    */

    const cbmCharge =
      cbm * 79;

    /*
      Clearance
    */

    const clearance =
      docs +
      declaration +
      terminal +
      permit +
      thc +
      handling +
      deliveryOrder +
      customs +
      destination +
      transportCharge +
      cbmCharge;

    /*
      Total
    */

    const total =
      clearance;

    return {
      country: "SINGAPORE",

      currency: "SGD",

      transport: "Sea",

      zone: null,

      duty: 0,

      clearance,

      delivery: 0,

      total,

      breakdown: {
        docs,

        declaration,

        terminal,

        permit,

        thc,

        handling,

        deliveryOrder,

        customs,

        destination,

        transportCharge,

        cbm,

        cbmCharge
      }
    };
  }

  /* =====================================================
     COURIER
  ===================================================== */

  if (transport === "Courier") {
    return {
      country: "SINGAPORE",

      currency: "SGD",

      transport: "Courier",

      zone: null,

      duty: 0,

      clearance: 0,

      delivery: 0,

      total: 0,

      error:
        "Singapore does not support Courier"
    };
  }

  /* =====================================================
     INVALID
  ===================================================== */

  return {
    country: "SINGAPORE",

    currency: "SGD",

    transport,

    duty: 0,

    clearance: 0,

    delivery: 0,

    total: 0,

    error: "Invalid transport type"
  };
}
