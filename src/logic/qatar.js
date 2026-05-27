// src/logic/qatar.js
// Exact mirror of Excel sheet "Qatar" in C&D Calculator V1.06.xlsm
//
// COURIER ONLY — Air and Sea not offered
// Output currency: GBP (UK office), EUR (Germany), USD (USA)
//
// FORMULA (from Excel, invoice value = GBP/EUR/USD depending on office):
//   Merchandise Process Fee = clamp(value × 0.003464, min=27.75, max=538.4)
//   Duty Tax Paid Fee       = 25 (fixed)
//   Duty                    = value × 0.05  (shown separately to trader)
//   Legalisation Fee        = bracket lookup on QAR value of invoice
//     QAR value = value × xRate (QAR per GBP/EUR/USD)
//     Brackets (QAR):
//       1 – 15,000        → Total QAR 650   (Attestation 150 + Invoices 500)
//       15,001 – 100,000  → Total QAR 1,150 (Attestation 150 + Invoices 1,000)
//       100,001 – 250,000 → Total QAR 2,650 (Attestation 150 + Invoices 2,500)
//       250,001 – 1,000,000 → Total QAR 5,150 (Attestation 150 + Invoices 5,000)
//       > 1,000,000       → 0.6% of QAR invoice value
//   Legalisation in output currency = legalisationQAR / xRate
//
// TOTAL = MerchandiseProcessFee + DutyTaxPaidFee + LegalisationFee
// DUTY shown separately
//
// VERIFIED: value=47822 GBP, xRate=4.904658
//   QAR value = 47822 × 4.904658 = 234,518
//   Bracket C (100,001–250,000) → QAR 2,650 → GBP = 2650/4.904658 = 540.30 ✓
//   MerchandiseProcess = clamp(47822 × 0.003464, 27.75, 538.4)
//                      = clamp(165.65, 27.75, 538.4) = 165.65 ✓
//   DutyTaxPaid = 25 ✓
//   Total = 165.65 + 25 + 540.30 = 730.96 ✓ (Excel shows 730.958)

export function calculateQatar({
  value       = 0,   // Invoice value in output currency (GBP/EUR/USD)
  transport   = "Courier",
  officeCurrency = "GBP",  // GBP | EUR | USD
  rates       = {},  // live FX rates (1 GBP = x currency)
  settings    = {},  // Firestore settings/qatar (optional)
}) {
  if (transport.toLowerCase() !== "courier") {
    return {
      country: "QATAR", currency: officeCurrency,
      duty: 0, clearance: 0, delivery: 0, total: 0,
      note: "Qatar: Air and Sea are not offered. Courier only.",
    };
  }

  // QAR exchange rate — from live rates or settings fallback
  const qarPerGBP  = rates["QAR"] || settings.xRate || 4.924189;
  // Convert QAR rate to per-officeCurrency
  const gbpPerOfficeCurrency = officeCurrency === "GBP" ? 1
    : officeCurrency === "EUR" ? (rates["EUR"] ? 1 / rates["EUR"] * (rates["GBP"] || 1) : 0.85)
    : officeCurrency === "USD" ? (rates["USD"] ? 1 / rates["USD"] * (rates["GBP"] || 1) : 0.79)
    : 1;
  const qarPerOfficeCurrency = qarPerGBP * gbpPerOfficeCurrency;

  // Invoice value in QAR for bracket lookup
  const valueQAR = value * qarPerOfficeCurrency;

  // ── Merchandise Process Fee ──────────────────────────────────────
  const mpfMin  = settings.merchandiseProcessMin ?? 27.75;
  const mpfMax  = settings.merchandiseProcessMax ?? 538.4;
  const mpfRate = settings.merchandiseProcessPct ?? 0.003464;
  const mpf     = Math.min(Math.max(value * mpfRate, mpfMin), mpfMax);

  // ── Duty Tax Paid Fee ─────────────────────────────────────────────
  const dutyTaxPaidFee = settings.dutyTaxPaidFee ?? 25;

  // ── Duty (shown separately) ───────────────────────────────────────
  const dutyRate = settings.dutyRate ?? 0.05;
  const duty     = value * dutyRate;

  // ── Legalisation Fee ──────────────────────────────────────────────
  let legalisationQAR = 0;
  if      (valueQAR <= 15000)   legalisationQAR = 650;
  else if (valueQAR <= 100000)  legalisationQAR = 1150;
  else if (valueQAR <= 250000)  legalisationQAR = 2650;
  else if (valueQAR <= 1000000) legalisationQAR = 5150;
  else                          legalisationQAR = valueQAR * 0.006;

  const legalisationFee = legalisationQAR / qarPerOfficeCurrency;

  // ── Total ─────────────────────────────────────────────────────────
  const total = mpf + dutyTaxPaidFee + legalisationFee;

  return {
    country:  "QATAR",
    currency: officeCurrency,
    transport: "Courier",
    duty,
    clearance: mpf + dutyTaxPaidFee + legalisationFee,
    delivery:  0,
    total,
    breakdown: {
      "Merchandise process fee":    mpf,
      "Duty tax paid fee":          dutyTaxPaidFee,
      "Legalisation fee":           legalisationFee,
      [`Legalisation (QAR ${legalisationQAR.toFixed(0)})`]: legalisationFee,
      "QAR invoice value":          valueQAR,
      "Exchange rate (QAR/GBP)":    qarPerGBP,
    },
    note: "Qatar: Courier only. Air and Sea not offered. Non-hazardous general cargo only.",
    xRate: qarPerOfficeCurrency,
    valueQAR,
  };
}
