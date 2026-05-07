// src/logic/qatar.js

/* =========================================================
   QATAR ENGINE
   EXCEL MIRROR VERSION
========================================================= */

export function calculateQatar({
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
    GBP -> QAR
    Excel fixed rate
  */

  const qarValue =
    value * 4.65;

  /*
    Legalisation
    Excel brackets
  */

  let legalisation = 0;

  if (qarValue <= 15000) {
    legalisation = 650;
  }

  else if (qarValue <= 100000) {
    legalisation = 1150;
  }

  else if (qarValue <= 250000) {
    legalisation = 2650;
  }

  else if (qarValue <= 1000000) {
    legalisation = 5150;
  }

  else {
    legalisation =
      qarValue * 0.006;
  }

  /*
    Clearance
  */

  const clearance =
    legalisation;

  /*
    Delivery
  */

  const delivery = 0;

  /*
    Total
  */

  const total =
    duty +
    clearance +
    delivery;

  return {
    country: "QATAR",

    currency: "QAR",

    transport,

    zone: null,

    duty,

    clearance,

    delivery,

    total,

    breakdown: {
      invoiceValue: value,

      qarValue,

      legalisation
    }
  };
}
