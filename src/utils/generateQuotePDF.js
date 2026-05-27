import jsPDF from "jspdf";

export default function generateQuotePDF(quote) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, margin = 20, col2 = 120;

  const pink   = [196, 0, 106];
  const dark   = [15, 23, 42];
  const mid    = [100, 116, 139];
  const light  = [248, 250, 252];
  const white  = [255, 255, 255];
  const green  = [34, 197, 94];
  const slate  = [30, 41, 59];

  const SYMS = { GBP:"£", USD:"$", EUR:"€", AUD:"A$", ZAR:"R", SGD:"S$", SAR:"SR", QAR:"QR" };
  const s    = SYMS[quote.currency] || "";
  const fmt  = v => Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ref  = `QR-${String(quote.quoteNumber || "").padStart(5, "0")}`;
  const date = quote.createdAt?.seconds
    ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  // ── Header ──────────────────────────────────────────────────────
  pdf.setFillColor(...pink);
  pdf.rect(0, 0, W, 30, "F");
  pdf.setTextColor(...white);
  pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
  pdf.text("Quinta Raddison Ltd", margin, 13);
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  pdf.text("C&D Shipping Calculator  ·  www.qrltd.co.uk", margin, 20);
  pdf.setFontSize(24); pdf.setFont("helvetica", "bold");
  pdf.text("QUOTE", W - margin, 20, { align: "right" });

  // ── Reference bar ───────────────────────────────────────────────
  pdf.setFillColor(...dark);
  pdf.rect(0, 30, W, 12, "F");
  pdf.setTextColor(...white);
  pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
  pdf.text(ref, margin, 38);
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  pdf.text(`Date: ${date}`, W - margin, 38, { align: "right" });

  // ── Two-column customer / shipment info ──────────────────────────
  let y = 52;
  pdf.setTextColor(...mid); pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold");
  pdf.text("PREPARED FOR", margin, y);
  y += 5;
  pdf.setTextColor(...dark); pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
  pdf.text(quote.customerName || "—", margin, y);
  y += 5; pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(...mid);
  pdf.text(`Destination: ${quote.country || "—"}`, margin, y); y += 5;
  pdf.text(`Transport: ${quote.transport || "—"}`, margin, y); y += 5;
  if (quote.zone)      { pdf.text(`Zone: ${quote.zone}`, margin, y); y += 5; }
  if (quote.createdBy) { pdf.text(`Prepared by: ${quote.createdBy}`, margin, y); y += 5; }

  let ry = 52;
  pdf.setTextColor(...mid); pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold");
  pdf.text("SHIPMENT DETAILS", col2, ry); ry += 5;
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  const details = [
    ["Weight",         quote.weight ? `${quote.weight} kg` : "—"],
    ["Pieces",         quote.pieces ? String(quote.pieces) : "—"],
    ["CBM",            quote.cbm    ? `${quote.cbm} m³` : "—"],
    ["Invoice value",  `${SYMS[quote.inputCurrency] || ""}${fmt(quote.valueInput || 0)} ${quote.inputCurrency || ""}`],
    ["Quote currency", quote.currency || ""],
  ];
  details.forEach(([lbl, val]) => {
    pdf.setTextColor(...mid); pdf.text(lbl, col2, ry);
    pdf.setTextColor(...dark); pdf.text(val, W - margin, ry, { align: "right" });
    ry += 5;
  });

  // ── Exchange rates used ──────────────────────────────────────────
  y = Math.max(y, ry) + 4;
  if (quote.fxRates && quote.fxDate) {
    pdf.setFillColor(15, 30, 50);
    pdf.rect(margin, y, W - margin * 2, 14, "F");
    pdf.setTextColor(148, 163, 184); pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold");
    pdf.text("EXCHANGE RATES USED", margin + 3, y + 5);
    pdf.setFont("helvetica", "normal");
    const fxPairs = Object.entries(quote.fxRates || {})
      .filter(([k, v]) => v && k !== "GBP")
      .map(([k, v]) => `1 GBP = ${Number(v).toFixed(4)} ${k}`)
      .join("   ·   ");
    pdf.text(`${fxPairs}   ·   Date: ${quote.fxDate}`, margin + 3, y + 10, { maxWidth: W - margin * 2 - 6 });
    y += 18;
  }

  // ── Divider ──────────────────────────────────────────────────────
  pdf.setDrawColor(...pink); pdf.setLineWidth(0.4);
  pdf.line(margin, y, W - margin, y); y += 8;

  // ── Breakdown table ──────────────────────────────────────────────
  pdf.setFillColor(...light);
  pdf.rect(margin, y - 4, W - margin * 2, 8, "F");
  pdf.setTextColor(...mid); pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold");
  pdf.text("COST BREAKDOWN", margin + 2, y + 0.5);
  pdf.text(`AMOUNT (${quote.currency || "GBP"})`, W - margin - 2, y + 0.5, { align: "right" });
  y += 9;

  const skipKeys = ["QAR invoice value", "Exchange rate", "VAT outlay", "Invoice value"];
  const rows = [];
  if (quote.breakdown && typeof quote.breakdown === "object") {
    Object.entries(quote.breakdown).forEach(([k, v]) => {
      if (typeof v === "number" && v !== 0 && !skipKeys.some(sk => k.startsWith(sk))) {
        rows.push([k, `${s}${fmt(v)}`]);
      }
    });
  }
  if (!rows.length) {
    if (quote.clearance > 0) rows.push(["Clearance charges", `${s}${fmt(quote.clearance)}`]);
    if (quote.delivery  > 0) rows.push(["Local delivery",    `${s}${fmt(quote.delivery)}`]);
  }

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
  rows.forEach((row, i) => {
    if (i % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, y - 3.5, W - margin * 2, 7, "F"); }
    pdf.setTextColor(...dark); pdf.text(row[0], margin + 2, y + 0.5);
    pdf.setTextColor(...mid);  pdf.text(row[1], W - margin - 2, y + 0.5, { align: "right" });
    y += 7;
  });
  y += 5;

  // ── C&D Total — pink ─────────────────────────────────────────────
  pdf.setFillColor(...pink);
  pdf.rect(margin, y, W - margin * 2, 14, "F");
  pdf.setTextColor(...white); pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
  pdf.text("C&D TOTAL", margin + 4, y + 9);
  pdf.setFontSize(14);
  pdf.text(`${quote.currency || "GBP"} ${fmt(quote.total)}`, W - margin - 4, y + 9, { align: "right" });
  y += 18;

  // ── Duty box — dark slate (matches scheme) ──────────────────────
  if ((quote.duty || 0) > 0) {
    pdf.setFillColor(...slate);
    pdf.rect(margin, y, W - margin * 2, 14, "F");
    pdf.setDrawColor(...pink); pdf.setLineWidth(0.5);
    pdf.rect(margin, y, W - margin * 2, 14, "S");
    pdf.setTextColor(...white); pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
    pdf.text("DUTY  (payable by consignee — not included in C&D total)", margin + 4, y + 9);
    pdf.setFontSize(13);
    pdf.setTextColor(244, 114, 182); // pink-400
    pdf.text(`${quote.currency || "GBP"} ${fmt(quote.duty)}`, W - margin - 4, y + 9, { align: "right" });
    y += 18;
  }

  // ── Notes ────────────────────────────────────────────────────────
  if (quote.note) {
    y += 2;
    pdf.setTextColor(...mid); pdf.setFontSize(8); pdf.setFont("helvetica", "italic");
    const noteLines = pdf.splitTextToSize(quote.note, W - margin * 2);
    pdf.text(noteLines, margin, y);
    y += noteLines.length * 4.5 + 4;
  }

  // ── Disclaimer ───────────────────────────────────────────────────
  pdf.setTextColor(100, 116, 139); pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal");
  pdf.text(
    "All exchange rates are sourced from public financial data feeds. Final charges may vary subject to actual weight, dimensions and prevailing duty rates.",
    margin, y, { maxWidth: W - margin * 2 }
  );

  // ── Footer ───────────────────────────────────────────────────────
  pdf.setFillColor(...dark);
  pdf.rect(0, H - 14, W, 14, "F");
  pdf.setTextColor(100, 116, 139); pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
  pdf.text("Quinta Raddison Ltd  ·  C&D Shipping Calculator", margin, H - 5);
  pdf.setTextColor(...pink);
  pdf.text(ref, W - margin, H - 5, { align: "right" });

  pdf.save(`${ref}-${(quote.customerName || "quote").replace(/\s+/g, "-")}.pdf`);
}
