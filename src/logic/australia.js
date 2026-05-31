// src/logic/australia.js
// Exact mirror of Excel "Australia" sheet — C&D Calculator V1.06.xlsm
//
// LOCAL DELIVERY:
//   Two services — T76 (20kg threshold) and S76 (5kg threshold)
//   Both include 40.6% fuel surcharge on the freight component
//   Calculator picks whichever gives the LOWER total cost
//
// T76: base + max(0, weight-20) × perKg/20  → × 1.406
// S76: base + max(0, weight-5)  × perKg/5   → × 1.406
//
// Zone codes: TA1 NN1 QQ1 SS1 WW1 VV1 QQ2 QQ3 QQ4 VV2 (WW2 → uses WW1 rates)

// ── Rate tables (from Excel rows 9-15) ──────────────────────────
// All rates in AUD
const T76 = {
  TA1: { base: 17.91, perKg: 0.4158 },
  NN1: { base: 19.64, perKg: 0.5458 },
  QQ1: { base: 25.41, perKg: 0.7277 },
  SS1: { base: 31.19, perKg: 0.8577 },
  WW1: { base: 36.97, perKg: 1.1955 },
  VV1: { base: 42.74, perKg: 1.4814 },
  QQ2: { base: 48.52, perKg: 2.1312 },
  QQ3: { base: 60.07, perKg: 2.8069 },
  QQ4: { base: 65.85, perKg: 4.1584 },
  VV2: { base: 77.40, perKg: 4.6782 },
  WW2: { base: 36.97, perKg: 1.1955 }, // WW2 → WW1 rates per Excel
};

const S76 = {
  TA1: { base: 15.00,  perKg: 0.8997  },
  NN1: { base: 20.99,  perKg: 2.9990  },
  QQ1: { base: 26.99,  perKg: 5.9980  },
  SS1: { base: 35.99,  perKg: 7.1976  },
  WW1: { base: 41.99,  perKg: 10.7964 },
  VV1: { base: 47.98,  perKg: 13.1956 },
  QQ2: { base: 74.98,  perKg: 16.1946 },
  QQ3: { base: 83.97,  perKg: 17.3942 },
  QQ4: { base: 119.96, perKg: 25.1916 },
  VV2: { base: 149.95, perKg: 28.1906 },
  WW2: { base: 41.99,  perKg: 10.7964 }, // WW2 → WW1 rates
};

const FUEL = 0.406; // 40.6% fuel surcharge on freight

function calcDelivery(zoneCode, weight, settings = {}) {
  const zone = (zoneCode || "").toUpperCase().trim();
  // Use Firestore settings if available, fallback to hardcoded tables
  const t = (settings.t76 && settings.t76[zone]) ? settings.t76[zone] : T76[zone];
  const s = (settings.s76 && settings.s76[zone]) ? settings.s76[zone] : S76[zone];
  const fuel = settings.fuelSurcharge ?? FUEL;
  if (!t && !s) return { delivery: 0, service: "none", note: `Unknown zone: ${zone}` };

  const tFreight = t ? t.base + Math.max(0, weight - 20) * t.perKg : Infinity;
  const tTotal   = tFreight * (1 + fuel);

  const sFreight = s ? s.base + Math.max(0, weight - 5) * s.perKg : Infinity;
  const sTotal   = sFreight * (1 + fuel);

  if (tTotal <= sTotal) {
    return {
      delivery: tTotal, service: "T76",
      baseFreight: tFreight, fuel: tFreight * fuel,
      zoneCode: zone,
    };
  }
  return {
    delivery: sTotal, service: "S76",
    baseFreight: sFreight, fuel: sFreight * FUEL,
    zoneCode: zone,
  };
}

// ── Main export ─────────────────────────────────────────────────
export function calculateAustralia({
  value      = 0,   // AUD
  valueGBP   = 0,   // GBP (for disbursement calc)
  weight     = 0,
  cbm        = 0,
  transport  = "Courier",
  zone       = "",  // zone code from customer record
  settings   = {},
}) {
  const zoneCode = String(zone || "").toUpperCase().trim();
  const t = transport.toLowerCase();

  const dutyRate = 0.05;
  const duty     = value * dutyRate;

  // ── COURIER ─────────────────────────────────────────────────────
  if (t === "courier") {
    const abfCharge    = value <= 1000 ? 0 : 190;
    const disbFixed    = 20;
    const disbPct      = valueGBP * 0.03;
    const disbursement = disbFixed + disbPct;

    let delivResult = { delivery: 0, service: "DHL direct (≤ AUD 1,000)" };
    if (value > 1000 && zoneCode) delivResult = calcDelivery(zoneCode, weight, settings);

    const clearance = abfCharge + disbursement;
    const total     = clearance + delivResult.delivery;

    return {
      country: "AUSTRALIA", currency: "AUD", transport: "Courier",
      zone: zoneCode, duty,
      clearance, delivery: delivResult.delivery, total,
      deliveryService: delivResult.service,
      breakdown: {
        "Duty (5%)":                          duty,
        "ABF charge":                         abfCharge,
        "Disbursement — fixed":               disbFixed,
        "Disbursement — 3% of GBP value":     disbPct,
        [`Local delivery — ${delivResult.service} (incl. 40.6% fuel)`]: delivResult.delivery,
      },
      note: value <= 1000
        ? "Invoice ≤ AUD 1,000: DHL direct, no ABF charge applies."
        : `Delivery service: ${delivResult.service} selected (lower cost of T76 / S76)`,
    };
  }

  // ── AIR ──────────────────────────────────────────────────────────
  if (t === "air") {
    const s = settings.air || {};
    const elec   = value > 10000
      ? (s.electronicProcessingOver10k  ?? 201)
      : (s.electronicProcessingUnder10k ?? 90);
    const quar   = s.quarantineProcessing          ?? 49;
    const decl   = value > 10000
      ? (s.declarationOver10k           ?? 152)
      : (s.declarationUnder10k          ?? 50);
    const docFee = s.destinationAirlineDocFee       ?? 80;
    const cust   = s.customsClearanceFee            ?? 130;
    const chain  = s.chainOfResponsibility          ?? 10;
    const cmr    = s.cmrFee                         ?? 20;
    const destQ  = s.destinationQuarantineProcessing ?? 45;
    const destH  = s.destinationHandling            ?? 85;

    // Weight-based
    const cargoPerKg = s.destinationCargoTerminalOpsPerKg ?? 0.65;
    const intlMin    = s.destinationIntlTerminalMin        ?? 80;
    const intlPerKg  = s.destinationIntlTerminalPerKg      ?? 0.175;
    const cargoOps   = weight * cargoPerKg;
    const intlTerm   = Math.max(intlMin, weight * intlPerKg);

    const clearance = elec + quar + decl + docFee + cust + chain + cmr +
                      cargoOps + intlTerm + destQ + destH;

    let delivResult = { delivery: 0, service: "none" };
    if (zoneCode) delivResult = calcDelivery(zoneCode, weight, settings);

    const total = duty + clearance + delivResult.delivery;

    return {
      country: "AUSTRALIA", currency: "AUD", transport: "Air",
      zone: zoneCode, duty, clearance,
      delivery: delivResult.delivery, total,
      deliveryService: delivResult.service,
      breakdown: {
        "Duty (5%)":                          duty,
        "Electronic processing":              elec,
        "Quarantine processing":              quar,
        "Declaration charge":                 decl,
        "Airline document fee":               docFee,
        "Customs clearance":                  cust,
        "Chain of responsibility":            chain,
        "CMR fee":                            cmr,
        "Cargo terminal ops (per kg × 0.65)": cargoOps,
        "International terminal (min AUD 80, per kg × 0.175)": intlTerm,
        "Destination quarantine":             destQ,
        "Destination handling":               destH,
        [`Local delivery — ${delivResult.service} (incl. 40.6% fuel)`]: delivResult.delivery,
      },
    };
  }

  // ── SEA ───────────────────────────────────────────────────────────
  if (t === "sea") {
    const s = settings.sea || {};
    const portCharges  = s.destinationPortCharges       ?? 95;
    const terminal     = s.destinationTerminalHandling  ?? 20;
    const delivOrder   = s.deliveryOrderFee             ?? 50;
    const destQ        = s.destinationQuarantineFee     ?? 45;
    const cmr          = s.cmrFee                       ?? 25;
    const customs      = s.customsClearance             ?? 125;
    const elecEntry    = s.electronicEntryProcessing    ?? 201;
    const quarFee      = s.quarantineProcessingFee      ?? 49;
    const declFee      = s.declarationProcessingFee     ?? 152;
    const cbmRate      = s.perCbmRate                   ?? 20;
    const cbmCharge    = cbm * cbmRate;

    const clearance = portCharges + terminal + delivOrder + destQ + cmr +
                      customs + elecEntry + quarFee + declFee + cbmCharge;

    let delivResult = { delivery: 0, service: "none" };
    if (zoneCode) delivResult = calcDelivery(zoneCode, weight, settings);

    const total = duty + clearance + delivResult.delivery;

    return {
      country: "AUSTRALIA", currency: "AUD", transport: "Sea",
      zone: zoneCode, duty, clearance,
      delivery: delivResult.delivery, total,
      deliveryService: delivResult.service,
      breakdown: {
        "Duty (5%)":                          duty,
        "Destination port charges":           portCharges,
        "Terminal handling":                  terminal,
        "Delivery order fee":                 delivOrder,
        "Destination quarantine":             destQ,
        "CMR fee":                            cmr,
        "Customs clearance":                  customs,
        "Electronic entry":                   elecEntry,
        "Quarantine fee":                     quarFee,
        "Declaration fee":                    declFee,
        "CBM charge":                         cbmCharge,
        [`Local delivery — ${delivResult.service} (incl. 40.6% fuel)`]: delivResult.delivery,
      },
    };
  }

  return { country: "AUSTRALIA", currency: "AUD", duty: 0, clearance: 0, delivery: 0, total: 0, error: "Invalid transport" };
}

// Export tables so settings page can display them
export { T76, S76, FUEL };
