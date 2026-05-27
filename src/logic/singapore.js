// src/logic/singapore.js
// Exact mirror of Excel sheet "Singapore" in C&D Calculator V1.06.xlsm
//
// AIR and SEA only (Courier = see destination notes, not offered standard)
// Output currency: GBP (UK), EUR (Germany), USD (USA)
// All SGD charges converted to output currency via live FX rates
//
// AIR (all fixed SGD):
//   Documentation     = SGD 35
//   Customs Examination = SGD 15
//   Transport         = SGD 210
//   Labour            = SGD 65
//   Terminal Charge   = SGD 25
//   Agency Charge     = SGD 16.10
//   TOTAL AIR         = SGD 366.10
//
// SEA (all fixed SGD except warehouse handling per CBM):
//   Documentation     = SGD 40
//   Handling Fee      = SGD 100
//   Warehouse Handling= SGD 20 per CBM (variable)
//   Delivery Order Fee= SGD 140
//   Labour            = SGD 65
//   Permit            = SGD 40
//   Import Processing = SGD 60
//   Forklift          = SGD 65
//   Agency Fee        = SGD 45
//   Transportation    = SGD 210
//   Charges Outlayed  = SGD 650
//   TOTAL SEA         = SGD 1415 + (SGD 20 × CBM)
//
// COURIER: Not offered standard — DAP terms for Power Seraya/Keppel Seggers
//          Unless client has Deugro deferment account or additional 7% GST agreed

export function calculateSingapore({
  value          = 0,
  cbm            = 0,
  transport      = "Air",
  officeCurrency = "GBP",
  rates          = {},
  settings       = {},
}) {
  // SGD conversion rate to output currency
  const sgdPerGBP = rates["SGD"] || 1.71;
  const gbpPerSGD = 1 / sgdPerGBP;
  // Convert SGD to office currency
  const sgdToOutput = (sgd) => {
    const gbp = sgd * gbpPerSGD;
    if (officeCurrency === "GBP") return gbp;
    if (officeCurrency === "EUR") return gbp * (rates["EUR"] || 1.17);
    if (officeCurrency === "USD") return gbp * (rates["USD"] || 1.27);
    return gbp;
  };

  const t = transport.toLowerCase();

  if (t === "courier") {
    return {
      country:   "SINGAPORE",
      currency:  officeCurrency,
      transport: "Courier",
      duty:      0,
      clearance: 0,
      delivery:  0,
      total:     0,
      note:      "Singapore: Courier not offered as standard. DAP terms only for Power Seraya/Keppel Seggers. Other clients require 7% GST addition or Deugro deferment account.",
    };
  }

  if (t === "air") {
    const s = settings.air || {};
    const chargesSGD = {
      "Documentation":      s.documentation      ?? 35,
      "Customs examination":s.customsExamination  ?? 15,
      "Transport":          s.transport            ?? 210,
      "Labour":             s.labour              ?? 65,
      "Terminal charge":    s.terminalCharge       ?? 25,
      "Agency charge":      s.agencyCharge         ?? 16.1,
    };
    const totalSGD = Object.values(chargesSGD).reduce((a, b) => a + b, 0);
    const totalOutput = sgdToOutput(totalSGD);

    const breakdown = {};
    Object.entries(chargesSGD).forEach(([k, v]) => {
      breakdown[`${k} (SGD ${v.toFixed(2)})`] = sgdToOutput(v);
    });
    breakdown[`Exchange rate (1 GBP = ${sgdPerGBP.toFixed(4)} SGD)`] = null;

    return {
      country:   "SINGAPORE",
      currency:  officeCurrency,
      transport: "Air",
      duty:      0,
      clearance: totalOutput,
      delivery:  0,
      total:     totalOutput,
      totalSGD,
      breakdown,
      note:      `Total SGD ${totalSGD.toFixed(2)} converted at 1 GBP = ${sgdPerGBP.toFixed(4)} SGD`,
    };
  }

  if (t === "sea") {
    const s = settings.sea || {};
    const fixedSGD = {
      "Documentation":       s.documentation      ?? 40,
      "Handling fee":        s.handlingFee         ?? 100,
      "Delivery order fee":  s.deliveryOrderFee    ?? 140,
      "Labour":              s.labour              ?? 65,
      "Permit":              s.permit              ?? 40,
      "Import processing":   s.importProcessing    ?? 60,
      "Forklift":            s.forklift            ?? 65,
      "Agency fee":          s.agencyFee           ?? 45,
      "Transportation":      s.transportation      ?? 210,
      "Charges outlayed":    s.chargesOutlayed     ?? 650,
    };
    const perCbmRate    = s.perCbmRate ?? 20;
    const cbmChargeSGD  = cbm * perCbmRate;
    const fixedTotal    = Object.values(fixedSGD).reduce((a, b) => a + b, 0);
    const totalSGD      = fixedTotal + cbmChargeSGD;
    const totalOutput   = sgdToOutput(totalSGD);

    const breakdown = {};
    Object.entries(fixedSGD).forEach(([k, v]) => {
      breakdown[`${k} (SGD ${v})`] = sgdToOutput(v);
    });
    if (cbm > 0) {
      breakdown[`Warehouse handling (${cbm} CBM × SGD ${perCbmRate})`] = sgdToOutput(cbmChargeSGD);
    }
    breakdown[`Exchange rate (1 GBP = ${sgdPerGBP.toFixed(4)} SGD)`] = null;

    return {
      country:   "SINGAPORE",
      currency:  officeCurrency,
      transport: "Sea",
      duty:      0,
      clearance: totalOutput,
      delivery:  0,
      total:     totalOutput,
      totalSGD,
      breakdown,
      note:      `Total SGD ${totalSGD.toFixed(2)} converted at 1 GBP = ${sgdPerGBP.toFixed(4)} SGD`,
    };
  }

  return {
    country: "SINGAPORE", currency: officeCurrency,
    duty: 0, clearance: 0, delivery: 0, total: 0,
    error: "Invalid transport type",
  };
}
