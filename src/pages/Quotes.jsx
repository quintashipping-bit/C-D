// src/pages/Quotes.jsx
import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, addDoc, getDoc, setDoc, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

import { calculateAustralia }   from "../logic/australia";
import { calculateSouthAfrica } from "../logic/southAfricaLogic";
import { calculateSaudi }       from "../logic/saudi";
import { calculateQatar }       from "../logic/qatar";
import { calculateSingapore }   from "../logic/singapore";

import {
  getExchangeRates,
  toGBP,
  fromGBP,
  SYMBOLS,
  COUNTRY_INPUT_CURRENCY,
  OFFICE_CURRENCIES,
} from "../services/exchangeRates";

/* ─── Office options ──────────────────────────────────────── */
const OFFICES = [
  { id: "UK",      label: "UK (GBP £)",      currency: "GBP" },
  { id: "USA",     label: "USA (USD $)",      currency: "USD" },
  { id: "GERMANY", label: "Germany (EUR €)",  currency: "EUR" },
];

export default function Quotes() {
  const [customers, setCustomers]         = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [result, setResult]               = useState(null);
  const [saving, setSaving]               = useState(false);

  // Country settings (loaded from Firestore)
  const [australiaSettings, setAustraliaSettings] = useState({});

  // FX state
  const [rates, setRates]       = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesInfo, setRatesInfo]       = useState("");

  // User office (persisted to localStorage)
  const [office, setOffice] = useState(
    () => localStorage.getItem("qr_office") || "UK"
  );

  // Form state — value is always in inputCurrency
  const [form, setForm] = useState({
    customerId: "",
    valueInput: "",   // in inputCurrency
    weight: "",
    pieces: "",
    cbm: "",
    transport: "Courier",
  });

  // Derived: what currency does this customer's country use for input?
  const inputCurrency = useCallback(() => {
    if (!selectedCustomer) return OFFICE_CURRENCIES[office] || "GBP";
    const country = (selectedCustomer.country || "").toUpperCase().trim();
    return COUNTRY_INPUT_CURRENCY[country] || OFFICE_CURRENCIES[office] || "GBP";
  }, [selectedCustomer, office]);

  const ic = inputCurrency();
  const sym = SYMBOLS[ic] || ic;

  /* ── Load FX rates on mount ── */
  useEffect(() => {
    (async () => {
      setRatesLoading(true);
      const r = await getExchangeRates();
      setRates(r);
      const src = r._source === "live"
        ? `Live rates (${r._date}, frankfurter.app / ECB)`
        : r._source === "cache"
        ? `Cached rates (${r._date})`
        : "Fallback rates (offline)";
      setRatesInfo(src);
      setRatesLoading(false);
    })();
  }, []);

  /* ── Load customers and country settings ── */
  useEffect(() => {
    getDocs(collection(db, "customers"))
      .then(snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDoc(doc(db, "settings", "australia"))
      .then(snap => { if (snap.exists()) setAustraliaSettings(snap.data()); })
      .catch(() => {});
  }, []);

  function update(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function changeOffice(o) {
    setOffice(o);
    localStorage.setItem("qr_office", o);
    setResult(null);
  }

  function selectCustomer(id) {
    setSelectedCustomer(customers.find(c => c.id === id) || null);
    setForm(p => ({ ...p, customerId: id, valueInput: "" }));
    setResult(null);
  }

  /* ── Calculate ── */
  function calculate() {
    if (!selectedCustomer) { alert("Select a customer first"); return; }
    if (!rates) { alert("Exchange rates are still loading, please wait"); return; }

    const valueInInputCurrency = Number(form.valueInput || 0);
    const valueGBP = toGBP(valueInInputCurrency, ic, rates);
    const weight   = Number(form.weight || 0);
    const pieces   = Number(form.pieces || 0);
    const cbm      = Number(form.cbm    || 0);
    const country  = (selectedCustomer.country || "").toUpperCase().trim();

    let quote = null;
    const args = { customerName: selectedCustomer.name, value: valueGBP, weight, pieces, cbm, transport: form.transport };

    if (country === "AUSTRALIA") {
      // Australia engine needs AUD value (for duty/ABF), GBP value (for disbursement), and zone code
      const audValue  = valueInInputCurrency; // already in AUD (COUNTRY_INPUT_CURRENCY maps AU → AUD)
      const zoneNum   = Number(selectedCustomer.zone) || 0;
      const zoneCode  = selectedCustomer.zoneCode || "";
      quote = calculateAustralia({
        value:      audValue,
        valueGBP:   valueGBP,
        weight,
        cbm,
        transport:  form.transport,
        zone:       zoneCode || String(zoneNum),
        zoneNumber: zoneNum,
        settings:   australiaSettings,
      });
    } else
    if (country === "SOUTH AFRICA")                     quote = calculateSouthAfrica(args);
    else if (country === "SAUDI ARABIA" || country === "KSA") quote = calculateSaudi(args);
    else if (country === "QATAR")                            quote = calculateQatar(args);
    else if (country === "SINGAPORE")                        quote = calculateSingapore(args);
    else quote = { country: country || "Unknown", currency: "GBP", zone: "", duty: 0, clearance: 0, delivery: 0, total: 0, note: "No logic configured for this country" };

    // Attach FX metadata for display
    quote._valueGBP       = valueGBP;
    quote._valueInput     = valueInInputCurrency;
    quote._inputCurrency  = ic;
    quote._officeCurrency = OFFICE_CURRENCIES[office] || "GBP";
    quote._rates          = rates;

    setResult(quote);
  }

  /* ── Save quote with autonumber ── */
  async function saveQuote() {
    if (!result || !selectedCustomer) return;
    setSaving(true);
    try {
      // Get next quote number atomically
      let quoteNumber = 1;
      try {
        const counterRef = doc(db, "settings", "quoteCounter");
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(counterRef);
          quoteNumber = (snap.exists() ? snap.data().next : 0) + 1;
          tx.set(counterRef, { next: quoteNumber });
        });
      } catch (e) {
        console.warn("Counter failed, using timestamp fallback", e);
        quoteNumber = Date.now();
      }
      await addDoc(collection(db, "quotes"), {
        quoteNumber,
        customerId:    form.customerId,
        customerName:  selectedCustomer.name,
        country:       result.country,
        valueGBP:      result._valueGBP,
        valueInput:    result._valueInput,
        inputCurrency: result._inputCurrency,
        weight:        Number(form.weight),
        pieces:        Number(form.pieces),
        cbm:           Number(form.cbm),
        transport:     form.transport,
        zone:          result.zone || "",
        duty:          result.duty     || 0,
        clearance:     result.clearance || 0,
        delivery:      result.delivery  || 0,
        total:         result.total     || 0,
        currency:      result.currency  || "GBP",
        breakdown:     result.breakdown || {},
        fxDate:        rates?._date || "",
        status:        "draft",
        createdAt:     serverTimestamp(),
      });
      alert("Quote saved to history");
    } catch (e) {
      console.error(e);
      alert("Failed to save quote");
    }
    setSaving(false);
  }

  /* ── Derive GBP equivalent for display ── */
  const valueGBP  = rates && form.valueInput ? toGBP(Number(form.valueInput), ic, rates) : null;
  const rate1GBP  = rates ? rates[ic] : null;

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-2">Quote Engine</h1>

        {/* ── FX status bar ── */}
        <div className={`flex items-center justify-between text-xs px-4 py-2.5 rounded-lg mb-6 border ${
          ratesLoading
            ? "bg-slate-800 border-slate-700 text-slate-400"
            : "bg-green-900/20 border-green-800/60 text-green-300"
        }`}>
          <div className="flex items-center gap-2">
            {!ratesLoading && <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>}
            <span className="font-semibold text-green-300">
              {ratesLoading ? "Loading exchange rates…" : `Exchange rates live · Updated ${rates?._date || ""}`}
            </span>
          </div>
          {!ratesLoading && rates && (
            <span className="text-slate-400">
              1 GBP = {rates.AUD?.toFixed(2)} AUD · {rates.ZAR?.toFixed(2)} ZAR · {rates.USD?.toFixed(4)} USD · {rates.EUR?.toFixed(4)} EUR
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* ══ FORM ══ */}
          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            {/* Office / user location */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Your office location</label>
              <div className="flex gap-2">
                {OFFICES.map(o => (
                  <button
                    key={o.id}
                    onClick={() => changeOffice(o.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all ${
                      office === o.id
                        ? "border-fuchsia-500 bg-fuchsia-900/40 text-fuchsia-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Customer</label>
              <select className="w-full p-3 rounded-xl bg-zinc-800" value={form.customerId}
                onChange={e => selectCustomer(e.target.value)}>
                <option value="">— Select customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
                ))}
              </select>
            </div>

            {/* Customer info strip */}
            {selectedCustomer && (
              <div className="bg-zinc-800 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Country</span>
                  <span className="font-bold">{selectedCustomer.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Zone</span>
                  <span className="font-bold">{selectedCustomer.zone || "—"}</span>
                </div>
                {Number(selectedCustomer.rateKg) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Rate/kg</span>
                    <span className="font-bold">{selectedCustomer.rateKg}</span>
                  </div>
                )}
                {Number(selectedCustomer.surcharge) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Surcharge</span>
                    <span className="font-bold">{selectedCustomer.surcharge}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-700 pt-1 mt-1">
                  <span className="text-zinc-400">Input currency</span>
                  <span className="font-bold text-fuchsia-400">{ic} {sym}</span>
                </div>
              </div>
            )}

            {/* Goods value — labelled with the correct currency */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Goods value ({ic})
                {selectedCustomer && ic !== "GBP" && (
                  <span className="ml-2 text-zinc-500 text-xs">
                    — the invoice value in {ic}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">{sym}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.valueInput}
                  onChange={e => update("valueInput", e.target.value)}
                  className="w-full p-3 pl-8 bg-zinc-800 rounded-xl"
                />
              </div>
              {/* GBP equivalent shown when currency isn't GBP */}
              {ic !== "GBP" && valueGBP !== null && form.valueInput && (
                <div className="text-xs text-zinc-500 mt-1 flex justify-between">
                  <span>≈ £{valueGBP.toFixed(2)} GBP</span>
                  <span>Rate: 1 GBP = {rate1GBP?.toFixed(4)} {ic}</span>
                </div>
              )}
            </div>

            <InputField label="Weight (kg)"    placeholder="0"    value={form.weight} onChange={v => update("weight", v)} type="number" />
            <InputField label="Pieces"          placeholder="0"    value={form.pieces} onChange={v => update("pieces", v)} type="number" />
            <InputField label="CBM (sea only)"  placeholder="0.00" value={form.cbm}    onChange={v => update("cbm", v)}    type="number" />

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Transport mode</label>
              <select className="w-full p-3 bg-zinc-800 rounded-xl" value={form.transport}
                onChange={e => update("transport", e.target.value)}>
                <option>Courier</option>
                <option>Air</option>
                <option>Sea</option>
              </select>
            </div>

            <button
              onClick={calculate}
              disabled={ratesLoading}
              className="w-full bg-fuchsia-700 hover:bg-fuchsia-800 disabled:opacity-50 p-3 rounded-xl font-bold text-lg"
            >
              {ratesLoading ? "Loading rates…" : "Calculate Quote"}
            </button>
          </div>

          {/* ══ RESULTS ══ */}
          <div className="bg-zinc-900 p-6 rounded-2xl">
            {!result ? (
              <div className="text-zinc-400 text-center py-16">
                <div className="text-slate-500 text-sm">Select a customer and fill in the details to generate a quote</div>
              </div>
            ) : (
              <ResultPanel
                result={result}
                customer={selectedCustomer}
                form={form}
                rates={rates}
                office={office}
                onSave={saveQuote}
                saving={saving}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Result panel ─────────────────────────────────────────── */
function ResultPanel({ result, customer, form, rates, office, onSave, saving }) {
  const resultCurrency = result.currency || "GBP";
  const officeCurrency = OFFICE_CURRENCIES[office] || "GBP";
  const sym = SYMBOLS[resultCurrency] || resultCurrency;

  // Convert total to GBP and to office currency for reference
  const totalGBP = toGBP(result.total, resultCurrency, rates);
  const totalOffice = fromGBP(totalGBP, officeCurrency, rates);
  const officeSym = SYMBOLS[officeCurrency] || officeCurrency;

  // Also show input value in GBP
  const inputSym = SYMBOLS[result._inputCurrency] || result._inputCurrency;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="border-b border-zinc-800 pb-3">
        <div className="font-bold text-lg">{customer?.name}</div>
        <div className="text-zinc-400 text-sm">{result.country} · {form.transport}</div>
        {result.zone ? <div className="text-zinc-400 text-sm">Zone: {result.zone}</div> : null}
        {result.note  && <div className="text-amber-400 text-sm mt-1">⚠ {result.note}</div>}
        {result.error && <div className="text-red-400 text-sm mt-1">⚠ {result.error}</div>}
      </div>

      {/* Value entered */}
      <div className="bg-zinc-800 rounded-xl p-3 text-sm flex justify-between">
        <span className="text-zinc-400">Goods value entered</span>
        <span className="font-bold">{inputSym}{Number(result._valueInput || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {result._inputCurrency}</span>
      </div>
      {result._inputCurrency !== "GBP" && (
        <div className="text-xs text-zinc-500 -mt-3 px-1 flex justify-between">
          <span>GBP equivalent used in calculations</span>
          <span>£{Number(result._valueGBP || 0).toFixed(2)}</span>
        </div>
      )}

      {/* Summary boxes */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryBox label="Duty"      value={result.duty}      sym={sym} />
        <SummaryBox label="Clearance" value={result.clearance} sym={sym} />
        <SummaryBox label="Delivery"  value={result.delivery}  sym={sym} />
      </div>

      {/* Total — primary (destination currency) */}
      <div className="bg-fuchsia-950 border border-fuchsia-700 rounded-xl p-4">
        <div className="text-xs text-zinc-400 mb-1">Total cost ({resultCurrency})</div>
        <div className="text-4xl font-bold text-fuchsia-400">
          {sym}{Number(result.total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* FX conversions */}
      <div className="grid grid-cols-2 gap-3">
        {resultCurrency !== "GBP" && (
          <div className="bg-zinc-800 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-400 mb-1">In GBP</div>
            <div className="font-bold text-lg">£{totalGBP.toFixed(2)}</div>
          </div>
        )}
        {officeCurrency !== resultCurrency && officeCurrency !== "GBP" && (
          <div className="bg-zinc-800 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-400 mb-1">In {officeCurrency} (your office)</div>
            <div className="font-bold text-lg">{officeSym}{totalOffice.toFixed(2)}</div>
          </div>
        )}
        {officeCurrency === "GBP" && resultCurrency !== "GBP" && (
          <div className="bg-zinc-800 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-400 mb-1">In GBP (your office)</div>
            <div className="font-bold text-lg">£{totalGBP.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* FX rate note */}
      {resultCurrency !== "GBP" && (
        <div className="text-xs text-zinc-500 px-1">
          Rate used: 1 GBP = {rates?.[resultCurrency]?.toFixed(4)} {resultCurrency} · {rates?._date}
        </div>
      )}

      {/* Breakdown */}
      {result.breakdown && Object.keys(result.breakdown).length > 0 && (
        <div>
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Cost breakdown ({resultCurrency})</div>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(result.breakdown).map(([k, v]) =>
                typeof v === "number" && v !== 0 ? (
                  <tr key={k} className="border-b border-zinc-800">
                    <td className="py-2 text-zinc-400 capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</td>
                    <td className="py-2 text-right font-mono">{sym}{Number(v).toFixed(2)}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 p-3 rounded-xl font-bold"
      >
        {saving ? "Saving…" : "Save Quote to History"}
      </button>
    </div>
  );
}

function SummaryBox({ label, value, sym }) {
  return (
    <div className="bg-zinc-800 rounded-xl p-3 text-center">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="font-bold text-sm">{sym}{Number(value || 0).toFixed(2)}</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} className="w-full p-3 bg-zinc-800 rounded-xl" />
    </div>
  );
}
