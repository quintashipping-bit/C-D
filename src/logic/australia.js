// src/logic/australia.js
// Exact mirror of Excel "Australia" sheet — C&D Calculator V1.06.xlsm
//
// LOCAL DELIVERY: Two competing services — calculator picks the lower cost.
//
// T76 service: base + (weight - 20) × perKgAfter20, minimum = base, then × (1 + fuelSurcharge)
// S76 service: base + (weight - 5)  × perKgAfter5,  minimum = base, then × (1 + fuelSurcharge)
// Fuel surcharge (current): 40.6%
//
// Zone codes: TA1 NN1 QQ1 SS1 WW1 VV1 QQ2 QQ3 QQ4 WW2 (mapped to zones 1-10)
//
// VERIFIED: VV1 (zone 6), weight=161
//   T76: (42.74 + 141×1.4814) × 1.406 = 251.617 × 1.406 = 353.774 ✓
//   S76: (32.99 + 156×13.1956) × 1.406 = enormous → T76 wins ✓

// ── Default zone tables (from Excel rows 9-15) ─────────────────────────
// These are the defaults — can be overridden per-zone in Firestore settings/australia
export const DEFAULT_T76 = {
  TA1: { base: 17.91, perKgAfter20: 0.4158  },
  NN1: { base: 19.64, perKgAfter20: 0.5458  },
  QQ1: { base: 25.41, perKgAfter20: 0.7277  },
  SS1: { base: 31.19, perKgAfter20: 0.8577  },
  WW1: { base: 36.97, perKgAfter20: 1.1955  },
  VV1: { base: 42.74, perKgAfter20: 1.4814  },
  QQ2: { base: 48.52, perKgAfter20: 2.1312  },
  QQ3: { base: 60.07, perKgAfter20: 2.8069  },
  QQ4: { base: 65.85, perKgAfter20: 4.1584  },
  WW2: { base: 77.40, perKgAfter20: 4.6782  },
};

export const DEFAULT_S76 = {
  TA1: { base: 12,     perKgAfter5: 0.8997  },
  NN1: { base: 15,     perKgAfter5: 2.999   },
  QQ1: { base: 23.99,  perKgAfter5: 5.998   },
  SS1: { base: 26.99,  perKgAfter5: 7.1976  },
  WW1: { base: 29.99,  perKgAfter5: 10.7964 },
  VV1: { base: 32.99,  perKgAfter5: 13.1956 },
  QQ2: { base: 53.98,  perKgAfter5: 16.1946 },
  QQ3: { base: 56.98,  perKgAfter5: 17.3942 },
  QQ4: { base: 74.98,  perKgAfter5: 25.1916 },
  WW2: { base: 104.97, perKgAfter5: 28.1906 },
};

// Zone number → code mapping (from Excel col header row 9)
const ZONE_NUM_TO_CODE = {
  1:"TA1", 2:"NN1", 3:"QQ1", 4:"SS1", 5:"WW1",
  6:"VV1", 7:"QQ2", 8:"QQ3", 9:"QQ4", 10:"WW2",
};

function resolveZoneCode(zone, zoneNumber) {
  let code = String(zone || "").toUpperCase().trim();
  if (!code && zoneNumber) code = ZONE_NUM_TO_CODE[Number(zoneNumber)] || "";
  if (code && !isNaN(code)) code = ZONE_NUM_TO_CODE[Number(code)] || code;
  return code;
}

function calcLocalDelivery(zoneCode, weight, t76Table, s76Table, fuelRate) {
  if (!zoneCode) return { delivery: 0, service: "none", note: "No zone assigned to customer" };

  const t = t76Table[zoneCode];
  const s = s76Table[zoneCode];

  if (!t && !s) return { delivery: 0, service: "none", note: `Unknown zone: ${zoneCode}` };

  // T76: base + max(0, weight-20) × perKgAfter20, then × (1+fuel)
  const t76Base  = t ? t.base + Math.max(0, weight - 20) * t.perKgAfter20 : Infinity;
  const t76Total = t76Base * (1 + fuelRate);

  // S76: base + max(0, weight-5) × perKgAfter5, then × (1+fuel)
  const s76Base  = s ? s.base + Math.max(0, weight - 5) * s.perKgAfter5 : Infinity;
  const s76Total = s76Base * (1 + fuelRate);

  if (t76Total <= s76Total) {
    return {
      delivery:    t76Total,
      service:     "T76",
      baseFreight: t76Base,
      fuel:        t76Base * fuelRate,
      t76Total,
      s76Total,
    };
  } else {
    return {
      delivery:    s76Total,
      service:     "S76",
      baseFreight: s76Base,
      fuel:        s76Base * fuelRate,
      t76Total,
      s76Total,
    };
  }
}

// ── Main export ────────────────────────────────────────────────────────
export function calculateAustralia({
  value      = 0,   // Invoice value in AUD
  valueGBP   = 0,   // Invoice value in GBP (for disbursement)
  weight     = 0,
  cbm        = 0,
  transport  = "Courier",
  zone       = "",
  zoneNumber = null,
  settings   = {},
}) {
  const s = settings;

  // Merge zone tables: Firestore overrides fall back to Excel defaults
  const t76 = Object.assign({}, DEFAULT_T76, s.t76Zones || {});
  const s76 = Object.assign({}, DEFAULT_S76, s.s76Zones || {});
  const fuel = s.fuelSurcharge ?? 0.406;

  const zoneCode = resolveZoneCode(zone, zoneNumber);
  const t        = transport.toLowerCase();

  // Duty (always shown separately — never in C&D total)
  // Duty rate: always 5% per Excel. If stored in Firestore as 5 (not 0.05), normalise.
  const rawDutyRate = s.dutyRate ?? 0.05;
  const dutyRate = rawDutyRate > 1 ? rawDutyRate / 100 : rawDutyRate;
  const dutyAUD = value * dutyRate;

  // ── COURIER ────────────────────────────────────────────────────
  if (t === "courier") {
    if (value <= 1000) {
      return {
        country: "AUSTRALIA", currency: "AUD", transport: "Courier", zone: zoneCode,
        duty: 0, clearance: 0, delivery: 0, total: 0,
        breakdown: {},
        note: "Invoice ≤ AUD 1,000: DHL direct to client. No duty or ABF charges apply.",
      };
    }

    const abf          = s.courier?.abfChargeOver1000 ?? 190;
    const govtCharge   = s.courier?.govtCharge        ?? 190;
    const disbFixed    = s.courier?.disbursementFixed  ?? 20;
    const disbRate     = s.courier?.disbursementRate   ?? 0.03;
    const disbursement = disbFixed + (valueGBP * disbRate);

    const delivResult  = calcLocalDelivery(zoneCode, weight, t76, s76, fuel);

    // ABF lookup determines the GOVT charge amount — shown as one line on quote
    const govtChargeAmount = abf; // abf IS the govt charge (same value, different label)
    const clearance = govtChargeAmount + disbursement;
    const total     = clearance + delivResult.delivery;

    return {
      country: "AUSTRALIA", currency: "AUD", transport: "Courier", zone: zoneCode,
      duty: dutyAUD, clearance, delivery: delivResult.delivery, total,
      breakdown: {
        "Australia GOVT Charge":  govtChargeAmount,
        "Disbursement":           disbursement,
        "Local delivery":         delivResult.delivery,
      },
      serviceUsed: delivResult.service,
      note: `Local delivery: ${delivResult.service || "none"} (zone ${zoneCode || "not set"})`,
    };
  }

  // ── AIR ─────────────────────────────────────────────────────────
  if (t === "air") {
    const electronicProcessing  = value > 10000
      ? (s.air?.electronicProcessingOver10k  ?? 201)
      : (s.air?.electronicProcessingUnder10k ?? 90);
    const quarantineProcessing  = s.air?.quarantineProcessing             ?? 49;
    const declarationCharge     = value > 10000
      ? (s.air?.declarationOver10k           ?? 152)
      : (s.air?.declarationUnder10k          ?? 50);
    const airlineDocFee         = s.air?.destinationAirlineDocFee         ?? 80;
    const customsClearance      = s.air?.customsClearanceFee              ?? 130;
    const chainOfResponsibility = s.air?.chainOfResponsibility            ?? 10;
    const cmrFee                = s.air?.cmrFee                           ?? 20;
    const destQuarantine        = s.air?.destinationQuarantineProcessing  ?? 45;
    const destHandling          = s.air?.destinationHandling              ?? 85;

    const cargoOpsPerKg = s.air?.destinationCargoTerminalOpsPerKg ?? 0.65;
    const intlTermMin   = s.air?.destinationIntlTerminalMin        ?? 80;
    const intlTermPerKg = s.air?.destinationIntlTerminalPerKg      ?? 0.175;
    const cargoTermOps  = weight * cargoOpsPerKg;
    const intlTerminal  = Math.max(intlTermMin, weight * intlTermPerKg);

    const fixedClearance =
      electronicProcessing + quarantineProcessing + declarationCharge +
      airlineDocFee + customsClearance + chainOfResponsibility + cmrFee +
      cargoTermOps + intlTerminal + destQuarantine + destHandling;

    const delivResult = zoneCode
      ? calcLocalDelivery(zoneCode, weight, t76, s76, fuel)
      : { delivery: 0, service: "none" };

    const total = fixedClearance + delivResult.delivery;

    return {
      country: "AUSTRALIA", currency: "AUD", transport: "Air", zone: zoneCode,
      duty: dutyAUD, clearance: fixedClearance, delivery: delivResult.delivery, total,
      breakdown: {
        "Electronic processing":          electronicProcessing,
        "Quarantine processing":          quarantineProcessing,
        "Declaration charge":             declarationCharge,
        "Airline document fee":           airlineDocFee,
        "Customs clearance":              customsClearance,
        "Chain of responsibility":        chainOfResponsibility,
        "CMR fee":                        cmrFee,
        "Cargo terminal ops":             cargoTermOps,
        "International terminal":         intlTerminal,
        "Destination quarantine":         destQuarantine,
        "Destination handling":           destHandling,
        "Local delivery":                 delivResult.delivery,
      },
      serviceUsed: delivResult.service,
      note: `Local delivery: ${delivResult.service || "none"} (zone ${zoneCode || "not set"})`,
    };
  }

  // ── SEA ──────────────────────────────────────────────────────────
  if (t === "sea") {
    const destPortCharges      = s.sea?.destinationPortCharges      ?? 95;
    const terminalHandling     = s.sea?.destinationTerminalHandling  ?? 20;
    const deliveryOrderFee     = s.sea?.deliveryOrderFee             ?? 50;
    const destQuarantineFee    = s.sea?.destinationQuarantineFee     ?? 45;
    const cmrFee               = s.sea?.cmrFee                       ?? 25;
    const customsClearance     = s.sea?.customsClearance             ?? 125;
    const electronicEntry      = s.sea?.electronicEntryProcessing    ?? 201;
    const quarantineFee        = s.sea?.quarantineFee                ?? 49;
    const declarationFee       = s.sea?.declarationFee               ?? 152;
    const cbmCharge            = cbm * (s.sea?.perCbmRate ?? 20);

    const clearance = destPortCharges + terminalHandling + deliveryOrderFee +
      destQuarantineFee + cmrFee + customsClearance + electronicEntry +
      quarantineFee + declarationFee + cbmCharge;

    const delivResult = zoneCode
      ? calcLocalDelivery(zoneCode, weight, t76, s76, fuel)
      : { delivery: 0, service: "none" };

    const total = clearance + delivResult.delivery;

    return {
      country: "AUSTRALIA", currency: "AUD", transport: "Sea", zone: zoneCode,
      duty: dutyAUD, clearance, delivery: delivResult.delivery, total,
      breakdown: {
        "Destination port charges":  destPortCharges,
        "Terminal handling":         terminalHandling,
        "Delivery order fee":        deliveryOrderFee,
        "Destination quarantine":    destQuarantineFee,
        "CMR fee":                   cmrFee,
        "Customs clearance":         customsClearance,
        "Electronic entry":          electronicEntry,
        "Quarantine fee":            quarantineFee,
        "Declaration fee":           declarationFee,
        "CBM charge":                cbmCharge,
        "Local delivery":            delivResult.delivery,
      },
      serviceUsed: delivResult.service,
      note: `Local delivery: ${delivResult.service || "none"} (zone ${zoneCode || "not set"})`,
    };
  }

  return {
    country: "AUSTRALIA", currency: "AUD",
    duty: 0, clearance: 0, delivery: 0, total: 0,
    error: "Invalid transport type",
  };
}
