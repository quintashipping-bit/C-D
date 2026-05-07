// src/logic/saudi.js

/* =========================================================
   SAUDI ARABIA ENGINE
   EXCEL MIRROR VERSION
========================================================= */

export function calculateSaudi({
  value = 0,
  weight = 0,
  pieces = 0,
  cbm = 0,
  transport = "Air"
}) {
  /*
    Duty
    Excel:
    =Value * 5%
  */

  const duty =
    value * 0.05;

  /*
    Clearance
    Excel:
    =Value * 0.3464%
  */

  let clearance =
    value * 0.003464;

  /*
    Minimum
  */

  if (clearance < 27.75) {
    clearance = 27.75;
  }

  /*
    Maximum
  */

  if (clearance > 538.4) {
    clearance = 538.4;
  }

  /*
    Delivery
  */

  const delivery = 25;

  /*
    Total
  */

  const total =
    duty +
    clearance +
    delivery;

  return {
    country: "SAUDI ARABIA",

    currency: "SAR",

    transport,

    zone: null,

    duty,

    clearance,

    delivery,

    total,

    breakdown: {
      invoiceValue: value,

      duty,

      clearance,

      delivery
    }
  };
}
