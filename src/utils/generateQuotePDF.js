// src/utils/generateQuotePDF.js
// Professional branded PDF using jsPDF
// Uses QR brand colours: #C4006A (pink) and #3AAA35 (green)

import jsPDF from "jspdf";

export default function generateQuotePDF(quote) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297;
  const margin = 20;
  const col2 = 130; // right column x

  // ── Colours ──
  const pink  = [196, 0,   106];
  const green = [58,  170, 53];
  const dark  = [15,  23,  42];
  const mid   = [71,  85,  105];
  const light = [241, 245, 249];
  const white = [255, 255, 255];

  // ── Header bar ──
  pdf.setFillColor(...pink);
  pdf.rect(0, 0, W, 28, "F");

  // Company name in header
  pdf.setTextColor(...white);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Quinta Raddison Ltd", margin, 12);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("C&D Shipping Calculator", margin, 18);
  pdf.text("www.qrltd.co.uk", margin, 23);

  // QUOTE label top right
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("QUOTE", W - margin, 17, { align: "right" });

  // ── Quote reference box ──
  pdf.setFillColor(...dark);
  pdf.rect(0, 28, W, 14, "F");
  pdf.setTextColor(...white);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Quote Reference: QR-${String(quote.quoteNumber || quote.id || "").padStart(5, "0")}`, margin, 37);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const date = quote.createdAt?.seconds
    ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  pdf.text(`Date: ${date}`, W - margin, 37, { align: "right" });

  // ── Two-column info section ──
  let y = 52;

  // Left: Customer details
  pdf.setTextColor(...mid);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("PREPARED FOR", margin, y);

  y += 5;
  pdf.setTextColor(...dark);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text(quote.customerName || "—", margin, y);

  y += 5;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...mid);
  pdf.text(`Destination: ${quote.country || "—"}`, margin, y);
  y += 5;
  pdf.text(`Transport: ${quote.transport || "—"}`, margin, y);
  y += 5;
  if (quote.zone) { pdf.text(`Zone: ${quote.zone}`, margin, y); y += 5; }
  if (quote.fxDate) { pdf.text(`Exchange rates date: ${quote.fxDate}`, margin, y); y += 5; }

  // Right: Shipment details
  let ry = 52;
  pdf.setTextColor(...mid);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("SHIPMENT DETAILS", col2, ry);
  ry += 5;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...dark);

  const details = [
    ["Weight", quote.weight ? `${quote.weight} kg` : "—"],
    ["Pieces", quote.pieces ? String(quote.pieces) : "—"],
    ["CBM", quote.cbm ? `${quote.cbm} m³` : "—"],
    ["Goods value", `${quote.inputCurrency || "GBP"} ${Number(quote.valueInput || quote.value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`],
  ];
  details.forEach(([label, val]) => {
    pdf.setTextColor(...mid);
    pdf.text(label, col2, ry);
    pdf.setTextColor(...dark);
    pdf.text(val, W - margin, ry, { align: "right" });
    ry += 5;
  });

  // ── Divider ──
  y = Math.max(y, ry) + 6;
  pdf.setDrawColor(...pink);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, W - margin, y);
  y += 8;

  // ── Cost breakdown table ──
  pdf.setFillColor(...light);
  pdf.rect(margin, y - 4, W - margin * 2, 8, "F");
  pdf.setTextColor(...mid);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("COST BREAKDOWN", margin + 2, y + 0.5);
  pdf.text(`AMOUNT (${quote.currency || "GBP"})`, W - margin - 2, y + 0.5, { align: "right" });
  y += 8;

  const currencySym = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", ZAR: "R", SGD: "S$", SAR: "SR", QAR: "QR" };
  const sym = currencySym[quote.currency] || quote.currency || "£";

  const rows = [];

  // Add breakdown details if present
  if (quote.breakdown && typeof quote.breakdown === "object") {
    Object.entries(quote.breakdown).forEach(([k, v]) => {
      if (typeof v === "number" && v !== 0) {
        const label = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
        rows.push([label, `${sym}${Number(v).toFixed(2)}`]);
      }
    });
  }

  // Always show the three headline figures
  if (!rows.length) {
    if (quote.duty > 0)      rows.push(["Import Duty",          `${sym}${Number(quote.duty).toFixed(2)}`]);
    if (quote.clearance > 0) rows.push(["Customs Clearance",    `${sym}${Number(quote.clearance).toFixed(2)}`]);
    if (quote.delivery > 0)  rows.push(["Local Delivery",       `${sym}${Number(quote.delivery).toFixed(2)}`]);
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y - 3.5, W - margin * 2, 7, "F");
    }
    pdf.setTextColor(...dark);
    pdf.text(row[0], margin + 2, y + 0.5);
    pdf.setTextColor(...mid);
    pdf.text(row[1], W - margin - 2, y + 0.5, { align: "right" });
    y += 7;
  });

  // ── Total box ──
  y += 4;
  pdf.setFillColor(...pink);
  pdf.rect(margin, y, W - margin * 2, 14, "F");
  pdf.setTextColor(...white);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("TOTAL", margin + 4, y + 9);
  pdf.setFontSize(14);
  pdf.text(
    `${quote.currency || "GBP"} ${Number(quote.total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    W - margin - 4, y + 9, { align: "right" }
  );
  y += 22;

  // GBP equivalent if different currency
  if (quote.currency && quote.currency !== "GBP" && quote.valueGBP) {
    pdf.setTextColor(...mid);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    const totalGBP = quote.total && quote.valueGBP
      ? Number(quote.total).toFixed(2)
      : "—";
    pdf.text(`GBP equivalent: £${totalGBP} · Exchange rate date: ${quote.fxDate || "—"}`, margin, y);
    y += 8;
  }

  // ── Status badge ──
  const statusColors = {
    draft:    [71, 85, 105],
    sent:     [29, 78, 216],
    approved: [21, 128, 61],
    rejected: [185, 28, 28],
  };
  const sc = statusColors[quote.status] || statusColors.draft;
  pdf.setFillColor(...sc);
  pdf.roundedRect(margin, y, 30, 8, 2, 2, "F");
  pdf.setTextColor(...white);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text((quote.status || "DRAFT").toUpperCase(), margin + 15, y + 5.5, { align: "center" });
  y += 14;

  // ── Terms / disclaimer ──
  pdf.setTextColor(...mid);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "normal");
  const disclaimer = [
    "This quote is provided for indicative purposes only and is valid for 7 days from the date of issue.",
    "Final charges may vary subject to actual weight, dimensions, and prevailing duty rates.",
    "All exchange rates are sourced from public financial data feeds and are subject to market fluctuation.",
  ];
  disclaimer.forEach(line => {
    pdf.text(line, margin, y, { maxWidth: W - margin * 2 });
    y += 5;
  });

  // ── Footer ──
  pdf.setFillColor(...dark);
  pdf.rect(0, H - 16, W, 16, "F");
  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("Quinta Raddison Ltd · C&D Shipping Calculator", margin, H - 7);
  pdf.setTextColor(...pink);
  pdf.text(`QR-${String(quote.quoteNumber || "").padStart(5, "0")}`, W - margin, H - 7, { align: "right" });

  // ── Save ──
  const filename = `QR-${String(quote.quoteNumber || quote.id || "").padStart(5, "0")}-${(quote.customerName || "quote").replace(/\s+/g, "-")}.pdf`;
  pdf.save(filename);
}
