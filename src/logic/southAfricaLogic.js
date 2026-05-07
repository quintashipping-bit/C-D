import { customerRates } from "../data/customerRates";

/* =========================================================
   SOUTH AFRICA ENGINE
   MIRRORS EXCEL LOGIC
========================================================= */

export function calculateSouthAfrica({
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

  const zone =
    Number(customer?.zone || 220);

  const rateKg =
    Number(customer?.rateKg || 0);

  const surcharge =
    Number(customer?.surcharge || 0);

  /* =====================================================
     CONSTANTS FROM EXCEL
  ===================================================== */

  const AIR_HANDLING = 2250;
  const SPLIFE = 55;
  const COMMUNICATION = 90;
  const DOCUMENTATION = 500;

  const AIR_AGENCY_MIN = 220;

  const AIR_VAT_RATE = 0.15;
  const AIR_FUEL_SURCHARGE = 0.5977;

  const SEA_PROVISION = 12000;
  const SEA_AGENCY = 985;
  const SEA_DOCUMENTATION = 275;
  const SEA_COMMUNICATION = 82;
  const SEA_FACILITY = 500;

  const COURIER_HANDLING = 850;
  const COURIER_COMMUNICATION = 180;
  const COURIER_CUSTOMS = 480;

  /* =====================================================
     AIR
  ===================================================== */

  if (transport === "Air") {
    /*
      Cartage:
      =VLOOKUP(...)
    */

    const cartage = zone;

    /*
      Plus Fuel:
      =IF(B9<=220,0,(SUM(B9*B23)))
    */

    let plusFuel = 0;

    if (cartage > 220) {
      plusFuel = cartage * AIR_FUEL_SURCHARGE;
    }

    /*
      Total Cartage:
      =SUM(B9+B10)
    */

    const totalCartage =
      cartage + plusFuel;

    /*
      Total C+D
      =SUM(B4:B10)
    */

    const totalCD =
      AIR_HANDLING +
      SPLIFE +
      COMMUNICATION +
      DOCUMENTATION +
      totalCartage;

    /*
      Agency:
      =SUM(B13*B22)+B18
    */

    let agency =
      totalCD * 0.0375 +
      AIR_AGENCY_MIN;

    /*
      Total Cost Air
      =SUM(B13+B14)
    */

    const totalCostAir =
      totalCD + agency;

    /*
      VAT
      =SUM(B19*B24)
    */

    const vat =
      totalCostAir * AIR_VAT_RATE;

    /*
      FINAL
      =SUM(B13+B16+B14)
    */

    const total =
      totalCD +
      vat +
      agency;

    return {
      country: "SOUTH AFRICA",

      currency: "ZAR",

      transport: "Air",

      zone,

      duty: 0,

      clearance: totalCD,

      delivery: totalCartage,

      vat,

      agency,

      total,

      breakdown: {
        airlineHandling: AIR_HANDLING,

        splife: SPLIFE,

        communication: COMMUNICATION,

        documentation: DOCUMENTATION,

        cartage,

        plusFuel,

        totalCartage,

        totalCD,

        agency,

        vat
      }
    };
  }

  /* =====================================================
     SEA
  ===================================================== */

  if (transport === "Sea") {
    /*
      Cartage
      =B11
    */

    const cartage = zone;

    /*
      Total Costs via Sea
      =SUM(B27:B32)
    */

    const total =
      SEA_PROVISION +
      SEA_AGENCY +
      SEA_DOCUMENTATION +
      SEA_COMMUNICATION +
      SEA_FACILITY +
      cartage;

    return {
      country: "SOUTH AFRICA",

      currency: "ZAR",

      transport: "Sea",

      zone,

      duty: 0,

      clearance: total,

      delivery: cartage,

      total,

      breakdown: {
        provision: SEA_PROVISION,

        agency: SEA_AGENCY,

        documentation: SEA_DOCUMENTATION,

        communication: SEA_COMMUNICATION,

        facility: SEA_FACILITY,

        cartage
      }
    };
  }

  /* =====================================================
     COURIER
  ===================================================== */

  if (transport === "Courier") {
    /*
      Agency
      =B14
    */

    let agency =
      AIR_AGENCY_MIN;

    /*
      Plus Cartage
      =B11
    */

    const plusCartage =
      zone;

    /*
      Total Cost Courier
      =SUM(B37:B41)
    */

    const total =
      COURIER_HANDLING +
      COURIER_COMMUNICATION +
      COURIER_CUSTOMS +
      agency +
      plusCartage;

    return {
      country: "SOUTH AFRICA",

      currency: "ZAR",

      transport: "Courier",

      zone,

      duty: 0,

      clearance: total,

      delivery: plusCartage,

      agency,

      total,

      breakdown: {
        handoverAirlineHandling:
          COURIER_HANDLING,

        communication:
          COURIER_COMMUNICATION,

        customsClearance:
          COURIER_CUSTOMS,

        agency,

        plusCartage
      }
    };
  }

  /* =====================================================
     INVALID
  ===================================================== */

  return {
    country: "SOUTH AFRICA",

    currency: "ZAR",

    transport,

    duty: 0,

    clearance: 0,

    delivery: 0,

    total: 0,

    error: "Invalid transport type"
  };
}
