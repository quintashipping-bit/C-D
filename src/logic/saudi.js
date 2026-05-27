// src/logic/saudi.js
// Exact mirror of Excel sheet "Saudi Arabia" in C&D Calculator V1.06.xlsm
//
// COURIER ONLY (Air and Sea are "To Follow" — not implemented)
// Output currency: GBP (UK), EUR (Germany), USD (USA)
//
// FORMULA (from Excel):
//   Merchandise Process Fee = clamp(value × 0.003464, min=27.75, max=538.4)
//   Duty Tax Paid Fee       = 25 (fixed)
//   Duty                    = value × 0.05 (shown separately)
//   TOTAL C&D               = MerchandiseProcessFee + DutyTaxPaidFee
//
// VERIFIED: value=47822 GBP
//   MPF = clamp(47822 × 0.003464, 27.75, 538.4) = clamp(165.65, 27.75, 538.4) = 165.65 ✓
//   Duty = 47822 × 0.05 = 2391.1 ✓
//   Total = 165.65 + 25 = 190.65 ✓ (Excel "Total Costs Courier" = 190.655408)
//
// NOTE: Saudi has NO legalisation fee (unlike Qatar).
// Air and Sea cost structures are listed as "To Follow" in the Excel.

export function calculateSaudi({
  value          = 0,
  transport      = "Courier",
  officeCurrency = "GBP",
  rates          = {},
  settings       = {},
}) {
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

  if (transport.toLowerCase() === "courier") {
    const total = mpf + dutyTaxPaidFee;
    return {
      country:   "SAUDI ARABIA",
      currency:  officeCurrency,
      transport: "Courier",
      duty,
      clearance: total,
      delivery:  0,
      total,
      breakdown: {
        "Merchandise process fee": mpf,
        "Duty tax paid fee":       dutyTaxPaidFee,
      },
      note: "Duty rate is 5% general rate. If HS code available, check Saudi Arabia Duty List for specific rate.",
    };
  }

  // Air and Sea — not yet available
  return {
    country:   "SAUDI ARABIA",
    currency:  officeCurrency,
    transport,
    duty,
    clearance: 0,
    delivery:  0,
    total:     0,
    note:      `Saudi Arabia ${transport} costs are not yet configured. Contact the shipping team for a quote.`,
  };
}
