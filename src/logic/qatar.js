// src/logic/qatar.js
// Exact mirror of Excel sheet "Qatar" — Courier only
// Invoice entered in office currency (GBP/EUR/USD)
// QAR conversion used only for legalisation bracket lookup
// Output in same currency as input

export function calculateQatar({
  value          = 0,
  transport      = "Courier",
  officeCurrency = "GBP",
  rates          = {},
  settings       = {},
}) {
  if (transport.toLowerCase() !== "courier") {
    return {
      country: "QATAR", currency: officeCurrency,
      duty: 0, clearance: 0, delivery: 0, total: 0,
      note: "Qatar: Courier only — Air and Sea are not offered.",
    };
  }

  // QAR per unit of office currency (for bracket lookup only)
  const qarPerGBP = rates["QAR"] || settings.xRate || 4.924189;
  let qarPerUnit;
  if (officeCurrency === "GBP")      qarPerUnit = qarPerGBP;
  else if (officeCurrency === "EUR") qarPerUnit = qarPerGBP / (rates["EUR"] || 1.17);
  else if (officeCurrency === "USD") qarPerUnit = qarPerGBP / (rates["USD"] || 1.27);
  else                               qarPerUnit = qarPerGBP;

  const valueQAR = value * qarPerUnit;

  // Merchandise Process Fee — clamped % of invoice
  const mpfMin  = settings.merchandiseProcessMin ?? 27.75;
  const mpfMax  = settings.merchandiseProcessMax ?? 538.4;
  const mpfRate = settings.merchandiseProcessPct ?? 0.003464;
  const mpf     = Math.min(Math.max(value * mpfRate, mpfMin), mpfMax);

  // Duty Tax Paid Fee
  const dutyTaxPaidFee = settings.dutyTaxPaidFee ?? 25;

  // Duty — shown separately
  const dutyRate = settings.dutyRate ?? 0.05;
  const duty     = value * dutyRate;

  // Legalisation — bracket on QAR value, converted back to office currency
  let legQAR = 0;
  if      (valueQAR <= 15000)   legQAR = 650;
  else if (valueQAR <= 100000)  legQAR = 1150;
  else if (valueQAR <= 250000)  legQAR = 2650;
  else if (valueQAR <= 1000000) legQAR = 5150;
  else                          legQAR = valueQAR * 0.006;

  const legalisationFee = legQAR / qarPerUnit;

  const total = mpf + dutyTaxPaidFee + legalisationFee;

  return {
    country:   "QATAR",
    currency:  officeCurrency,
    transport: "Courier",
    duty,
    clearance: total,
    delivery:  0,
    total,
    breakdown: {
      "Merchandise process fee":                mpf,
      "Duty tax paid fee":                      dutyTaxPaidFee,
      "Legalisation fee":                       legalisationFee,
    },
    fxInfo: {
      qarPerGBP,
      valueQAR,
      legQAR,
      officeCurrency,
    },
    note: "Courier only. Non-hazardous general cargo only. Air and Sea not offered for Qatar.",
  };
}
