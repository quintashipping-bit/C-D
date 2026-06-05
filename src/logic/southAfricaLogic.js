// src/logic/southAfricaLogic.js
// Exact mirror of Excel sheet "South Africa" — C&D Calculator V1.06.xlsm
//
// ALL OUTPUT IN ZAR
// Input: value = invoice value in ZAR (entered by user)
//        weight = chargeable weight in kg
//
// AGENCY: invoiceZAR × 0.0375 (3.75%) — SHOWN on quote
// CARTAGE: ZAR 6 × (1 + 0.5977 fuel surcharge) = ZAR 9.5862 — SHOWN on quote
// VAT: INTERNAL ONLY — used for agency calculation cross-check, NOT shown on quote
//      VAT Agency  = invoice_GBP × 0.0375 × 0.165  (reference only)
//      VAT Outlay  = invoice_GBP × 0.165            (reference only)
//
// LOW VALUE/WEIGHT RULE (row 2 note):
//   If invoice < ZAR 50,000 AND weight < 30kg → flat fee ZAR 2,000
//
// VERIFIED vs Excel (weight=161kg):
//   Courier: 850+180+480+(invoiceZAR×0.0375)+9.5862 = 1935.2743 ✓
//   Air:     2250+55+(161×1.8)+90+500+(invoiceZAR×0.0375)+9.5862 = 3905.9729 ✓
//   Sea:     12000+985+275+82+500+9.5862 = 13851.5862 ✓

export function calculateSouthAfrica({
  value    = 0,   // Invoice value in ZAR
  weight   = 0,   // Chargeable weight kg
  transport = "Courier",
  settings = {},
}) {
  const t = transport.toLowerCase();

  // ── Low value / weight flat fee ──────────────────────────────────
  if (value < 50000 && weight < 30) {
    return {
      country:   "SOUTH AFRICA",
      currency:  "ZAR",
      transport,
      duty:      0,
      clearance: 2000,
      delivery:  0,
      total:     2000,
      breakdown: {
        "Flat fee (< ZAR 50,000 and < 30 kg)": 2000,
      },
      note: "Low value/weight shipment — flat rate ZAR 2,000 applies",
    };
  }

  // ── Shared components ────────────────────────────────────────────
  const cartageBase   = settings.cartageBase   ?? 6;
  const fuelRate      = settings.fuelSurcharge ?? 0.5977;
  const cartage       = cartageBase * (1 + fuelRate);          // ZAR 9.5862

  const agencyRate    = settings.agencyFee ?? 0.0375;
  const agency        = value * agencyRate;                     // ZAR × 3.75%

  // ── COURIER ──────────────────────────────────────────────────────
  if (t === "courier") {
    const s = settings.courier || {};
    const handover  = s.handoverAirlineHandling ?? 850;
    const comms     = s.communication           ?? 180;
    const customs   = s.importCustomsClearance  ?? 480;

    const total = handover + comms + customs + agency + cartage;

    return {
      country:   "SOUTH AFRICA",
      currency:  "ZAR",
      transport: "Courier",
      duty:      0,
      clearance: total,
      delivery:  0,
      total,
      breakdown: {
        "Handover / Airline handling":  handover,
        "Communication":                comms,
        "Import customs clearance":     customs,
        "Agency (3.75% of value)":      agency,
        "Cartage (incl. fuel)":         cartage,
      },
      note: "Duty varies by HS code — refer to SA Duty Rates schedule for commodity-specific rates.",
    };
  }

  // ── AIR ──────────────────────────────────────────────────────────
  if (t === "air") {
    const s = settings.air || {};
    const handover      = s.handoverAirlineHandling ?? 2250;
    const splitFee      = s.splitFee               ?? 55;
    const airlineHdgKg  = s.airlineHandlingPerKg   ?? 1.8;
    const airlineHdg    = weight * airlineHdgKg;               // per kg
    const comms         = s.communication          ?? 90;
    const docs          = s.documentation          ?? 500;

    const total = handover + splitFee + airlineHdg + comms + docs + agency + cartage;

    return {
      country:   "SOUTH AFRICA",
      currency:  "ZAR",
      transport: "Air",
      duty:      0,
      clearance: total,
      delivery:  0,
      total,
      breakdown: {
        "Handover / Airline handling":          handover,
        "Split fee":                            splitFee,
        [`Airline handling (${weight} kg × ZAR ${airlineHdgKg})`]: airlineHdg,
        "Communication":                        comms,
        "Documentation":                        docs,
        "Agency (3.75% of value)":              agency,
        "Cartage (incl. fuel)":                 cartage,
      },
      note: "Duty varies by HS code — refer to SA Duty Rates schedule.",
    };
  }

  // ── SEA ──────────────────────────────────────────────────────────
  if (t === "sea") {
    const s = settings.sea || {};
    const provision  = s.provisionAgentCartage ?? 12000;
    const agencyVDP  = s.agencyOnVDP           ?? 985;
    const docs       = s.documentation         ?? 275;
    const comms      = s.communication         ?? 82;
    const facility   = s.facilityFee           ?? 500;

    const total = provision + agencyVDP + docs + comms + facility + cartage;

    return {
      country:   "SOUTH AFRICA",
      currency:  "ZAR",
      transport: "Sea",
      duty:      0,
      clearance: total,
      delivery:  0,
      total,
      breakdown: {
        "Provision for agent / cartage surcharges": provision,
        "Agency on VDP":                           agencyVDP,
        "Documentation":                           docs,
        "Communication":                           comms,
        "Facility fee":                            facility,
        "Cartage (incl. fuel)":                    cartage,
      },
      note: "LCL general cargo only. FCL or out-of-gauge — obtain spot quote from Mike Vieyra or Louise.",
    };
  }

  return {
    country: "SOUTH AFRICA", currency: "ZAR",
    duty: 0, clearance: 0, delivery: 0, total: 0,
    error: "Invalid transport type",
  };
}
