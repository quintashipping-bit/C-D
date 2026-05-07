import { customerRates } from "../data/customerRates";

/* =========================================================
   AUSTRALIA ENGINE
   EXCEL MIRROR VERSION
========================================================= */

export function calculateAustralia({
  value = 0,
  weight = 0,
  pieces = 0,
  cbm = 0,
  transport = "Air",
  customerName = "",
  customerRate = null
}) {
  /* =====================================================
     CUSTOMER LOOKUP
  ===================================================== */

  const customer =
    customerRate ||
    customerRates.find(
      c =>
        c.customer?.trim()?.toUpperCase() ===
        customerName?.trim()?.toUpperCase()
    );

  /*
    Zone = local delivery zone
    Rate/KG = delivery multiplier
  */

  const zone =
    Number(customer?.zone || 0);

  const rateKg =
    Number(customer?.rateKg || 0);

  const surcharge =
    Number(customer?.surcharge || 0);

  /* =====================================================
     STATIC CHARGES
  ===================================================== */

  const AIR_DOCUMENTATION = 85;
  const AIR_CLEARANCE = 195;
  const AIR_SECURITY = 35;
  const AIR_HANDLING = 65;
  const AIR_FUEL = 45;

  const SEA_DOCUMENTATION = 120;
  const SEA_CLEARANCE = 295;
  const SEA_PORT = 185;
  const SEA_HANDLING = 120;

  const COURIER_CLEARANCE = 95;
  const COURIER_HANDLING = 45;

  /* =====================================================
     LOCAL DELIVERY
  ===================================================== */

  /*
    Excel logic:
    Zone = standard destination fee
    Rate/KG = additional kg multiplier
  */

  let localDelivery = 0;

  /*
    If no KG rate:
    local delivery = zone only
  */

  if (rateKg <= 0) {
    localDelivery = zone;
  }

  /*
    If KG rate exists:
    local delivery = zone + (weight × rate)
  */

  else {
    localDelivery =
      zone + (weight * rateKg);
  }

  /*
    Add surcharge if exists
  */

  localDelivery += surcharge;

  /* =====================================================
     AIR
  ===================================================== */

  if (transport === "Air") {
    /*
      Clearance stack
    */

    const clearance =
      AIR_DOCUMENTATION +
      AIR_CLEARANCE +
      AIR_SECURITY +
      AIR_HANDLING +
      AIR_FUEL;

    /*
      Total
    */

    const total =
      clearance +
      localDelivery;

    return {
      country: "AUSTRALIA",

      currency: "AUD",

      transport: "Air",

      zone,

      duty: 0,

      clearance,

      delivery: localDelivery,

      total,

      breakdown: {
        documentation:
          AIR_DOCUMENTATION,

        customsClearance:
          AIR_CLEARANCE,

        securityFee:
          AIR_SECURITY,

        handling:
          AIR_HANDLING,

        fuel:
          AIR_FUEL,

        zone,

        rateKg,

        weight,

        surcharge,

        localDelivery
      }
    };
  }

  /* =====================================================
     SEA
  ===================================================== */

  if (transport === "Sea") {
    /*
      CBM delivery adjustment
    */

    const cbmCharge =
      cbm * 79;

    /*
      Sea clearance
    */

    const clearance =
      SEA_DOCUMENTATION +
      SEA_CLEARANCE +
      SEA_PORT +
      SEA_HANDLING +
      cbmCharge;

    /*
      Total
    */

    const total =
      clearance +
      localDelivery;

    return {
      country: "AUSTRALIA",

      currency: "AUD",

      transport: "Sea",

      zone,

      duty: 0,

      clearance,

      delivery: localDelivery,

      total,

      breakdown: {
        documentation:
          SEA_DOCUMENTATION,

        customsClearance:
          SEA_CLEARANCE,

        portCharges:
          SEA_PORT,

        handling:
          SEA_HANDLING,

        cbm,

        cbmCharge,

        zone,

        rateKg,

        surcharge,

        localDelivery
      }
    };
  }

  /* =====================================================
     COURIER
  ===================================================== */

  if (transport === "Courier") {
    /*
      Courier clearance
    */

    const clearance =
      COURIER_CLEARANCE +
      COURIER_HANDLING;

    /*
      Total
    */

    const total =
      clearance +
      localDelivery;

    return {
      country: "AUSTRALIA",

      currency: "AUD",

      transport: "Courier",

      zone,

      duty: 0,

      clearance,

      delivery: localDelivery,

      total,

      breakdown: {
        customsClearance:
          COURIER_CLEARANCE,

        handling:
          COURIER_HANDLING,

        zone,

        rateKg,

        surcharge,

        localDelivery
      }
    };
  }

  /* =====================================================
     INVALID
  ===================================================== */

  return {
    country: "AUSTRALIA",

    currency: "AUD",

    transport,

    duty: 0,

    clearance: 0,

    delivery: 0,

    total: 0,

    error: "Invalid transport type"
  };
}
