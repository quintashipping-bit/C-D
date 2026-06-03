// src/pages/Quotes.jsx
import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, addDoc, getDoc, setDoc, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

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

const OFFICES = [
  { id: "UK",      label: "UK (GBP £)",     currency: "GBP" },
  { id: "USA",     label: "USA (USD $)",     currency: "USD" },
  { id: "GERMANY", label: "Germany (EUR €)", currency: "EUR" },
];

export default function Quotes() {
  const { profile } = useAuth();

  const [customers, setCustomers]   = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [result, setResult]         = useState(null);
  const [saving, setSaving]         = useState(false);

  // FX
  const [rates, setRates]           = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Country settings from Firestore
  const [countrySettings, setCountrySettings] = useState({});

  // Office — from profile, or persisted in localStorage
  const [office, setOffice] = useState(
    () => localStorage.getItem("qr_office") || "UK"
  );

  const [form, setForm] = useState({
    customerId: "", valueInput: "", weight: "",
    pieces: "", cbm: "", transport: "Courier",
  });

  // Which currency does the input use for this customer?
  const getInputCurrency = useCallback((cust, off) => {
    if (!cust) return OFFICE_CURRENCIES[off] || "GBP";
    const country = (cust.country || "").toUpperCase().trim();
    return COUNTRY_INPUT_CURRENCY[country] || OFFICE_CURRENCIES[off] || "GBP";
  }, []);

  const ic  = getInputCurrency(selectedCustomer, office);
  const sym = SYMBOLS[ic] || ic;
  // Office currency for Saudi/Qatar/Singapore output
  const officeCurrency = OFFICE_CURRENCIES[office] || "GBP";

  /* ── Load FX rates ── */
  useEffect(() => {
    (async () => {
      setRatesLoading(true);
      const r = await getExchangeRates();
      setRates(r);
      setRatesLoading(false);
    })();
  }, []);

  /* ── Load customers + all country settings ── */
  useEffect(() => {
    getDocs(collection(db, "customers"))
      .then(snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    Promise.all([
      getDoc(doc(db, "settings", "australia")),
      getDoc(doc(db, "settings", "qatar")),
      getDoc(doc(db, "settings", "saudi")),
      getDoc(doc(db, "settings", "singapore")),
      getDoc(doc(db, "settings", "southAfrica")),
    ]).then(([au, qa, sa, sg, za]) => {
      setCountrySettings({
        australia:   au.exists()  ? au.data()  : {},
        qatar:       qa.exists()  ? qa.data()  : {},
        saudi:       sa.exists()  ? sa.data()  : {},
        singapore:   sg.exists()  ? sg.data()  : {},
        southAfrica: za.exists()  ? za.data()  : {},
      });
    }).catch(() => {});
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
    if (!rates)            { alert("Exchange rates still loading, please wait"); return; }

    const valueInIC = Number(form.valueInput || 0);
    const valueGBP  = toGBP(valueInIC, ic, rates);
    const weight    = Number(form.weight || 0);
    const pieces    = Number(form.pieces || 0);
    const cbm       = Number(form.cbm    || 0);
    const country   = (selectedCustomer.country || "").toUpperCase().trim();

    let quote = null;

    if (country === "AUSTRALIA") {
      // Resolve zone code — handles both new (zoneCode) and old (zone as string) formats
      const zoneCode = selectedCustomer.zoneCode
        || (selectedCustomer.zone && isNaN(String(selectedCustomer.zone).trim())
            ? String(selectedCustomer.zone).trim().toUpperCase()
            : "");
      quote = calculateAustralia({
        value:    valueInIC,
        valueGBP,
        weight, cbm,
        transport: form.transport,
        zone:      zoneCode,
        settings:  countrySettings.australia || {},
      });

    } else if (country === "SOUTH AFRICA") {
      quote = calculateSouthAfrica({
        value:     valueInIC,   // ZAR
        weight, cbm,
        transport: form.transport,
        zone:      Number(selectedCustomer.zone)      || 0,
        rateKg:    Number(selectedCustomer.rateKg)    || 0,
        surcharge: Number(selectedCustomer.surcharge) || 0,
        settings:  countrySettings.southAfrica || {},
      });

    } else if (country === "SAUDI ARABIA" || country === "KSA") {
      // Value entered in office currency (GBP/EUR/USD)
      quote = calculateSaudi({
        value:          valueInIC,
        transport:      form.transport,
        officeCurrency,
        rates,
        settings:       countrySettings.saudi || {},
      });

    } else if (country === "QATAR") {
      quote = calculateQatar({
        value:          valueInIC,
        transport:      form.transport,
        officeCurrency,
        rates,
        settings:       countrySettings.qatar || {},
      });

    } else if (country === "SINGAPORE") {
      quote = calculateSingapore({
        value:          valueInIC,
        cbm,
        transport:      form.transport,
        officeCurrency,
        rates,
        settings:       countrySettings.singapore || {},
      });

    } else {
      quote = {
        country: country || "Unknown", currency: officeCurrency,
        duty: 0, clearance: 0, delivery: 0, total: 0,
        note: "No calculation logic configured for this destination.",
      };
    }

    quote._valueInput    = valueInIC;
    quote._inputCurrency = ic;
    quote._valueGBP      = valueGBP;
    quote._rates         = rates;
    quote._officeCurrency = officeCurrency;
    quote._fxDate        = rates._date;

    setResult(quote);
  }

  /* ── Save ── */
  async function saveQuote() {
    if (!result || !selectedCustomer) return;
    setSaving(true);
    try {
      let quoteNumber = 1;
      try {
        const counterRef = doc(db, "settings", "quoteCounter");
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(counterRef);
          quoteNumber = (snap.exists() ? snap.data().next : 0) + 1;
          tx.set(counterRef, { next: quoteNumber });
        });
      } catch (e) { quoteNumber = Date.now(); }

      await addDoc(collection(db, "quotes"), {
        quoteNumber,
        customerId:    form.customerId,
        customerName:  selectedCustomer.name,
        country:       result.country,
        valueGBP:      result._valueGBP,
        valueInput:    result._valueInput,
        inputCurrency: result._inputCurrency,
        officeCurrency: result._officeCurrency,
        weight:        Number(form.weight),
        pieces:        Number(form.pieces),
        cbm:           Number(form.cbm),
        transport:     form.transport,
        zone:          result.zone || selectedCustomer.zone || "",
        duty:          result.duty      || 0,
        clearance:     result.clearance || 0,
        delivery:      result.delivery  || 0,
        total:         result.total     || 0,
        currency:      result.currency  || officeCurrency,
        breakdown:     result.breakdown || {},
        fxDate:        result._fxDate   || "",
        fxRates:       { AUD: rates?.AUD, ZAR: rates?.ZAR, USD: rates?.USD, EUR: rates?.EUR, SGD: rates?.SGD, QAR: rates?.QAR, SAR: rates?.SAR },
        note:          result.note      || "",
        status:        "active",
        createdBy:     profile?.name    || "",
        createdAt:     serverTimestamp(),
      });
      alert("Quote saved to history");
    } catch (e) {
      console.error(e);
      alert("Failed to save quote");
    }
    setSaving(false);
  }

  const valueGBP   = rates && form.valueInput ? toGBP(Number(form.valueInput), ic, rates) : null;
  const rate1GBP   = rates ? rates[ic] : null;
  const country    = (selectedCustomer?.country || "").toUpperCase().trim();
  const isAUorZA   = country === "AUSTRALIA" || country === "SOUTH AFRICA";

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 max-w-7xl">

        <h1 className="text-2xl font-bold text-white mb-2">New Quote</h1>

        {/* FX status bar */}
        <div className={`flex items-center justify-between text-xs px-4 py-2.5 rounded-lg mb-6 border ${
          ratesLoading
            ? "bg-slate-800 border-slate-700 text-slate-400"
            : "bg-green-900/20 border-green-800/60"
        }`}>
          <div className="flex items-center gap-2">
            {!ratesLoading && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
            <span className={ratesLoading ? "text-slate-400" : "font-semibold text-green-300"}>
              {ratesLoading
                ? "Loading exchange rates…"
                : `Exchange rates live · Updated ${rates?._date || ""}`}
            </span>
          </div>
          {!ratesLoading && rates && (
            <span className="text-slate-400">
              1 GBP = {rates.AUD?.toFixed(2)} AUD · {rates.ZAR?.toFixed(2)} ZAR · {rates.USD?.toFixed(4)} USD · {rates.EUR?.toFixed(4)} EUR · {rates.SGD?.toFixed(4)} SGD · {rates.QAR?.toFixed(4)} QAR
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* ══ FORM ══ */}
          <div className="space-y-4">

            {/* ── Office selector ── */}
            {!isAUorZA && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Your office location</div>
                <div className="grid grid-cols-3 gap-2">
                  {OFFICES.map(o => (
                    <button key={o.id} onClick={() => changeOffice(o.id)}
                      className={`py-3 px-2 rounded-lg text-sm font-semibold border transition-all ${
                        office === o.id
                          ? "border-[#C4006A] bg-[#C4006A]/15 text-[#f472b6] shadow-[0_0_12px_rgba(196,0,106,0.2)]"
                          : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Customer ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">Customer</div>
              <select
                value={form.customerId}
                onChange={e => selectCustomer(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#C4006A] transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">— Select customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">{c.name} ({c.country})</option>
                ))}
              </select>

              {/* Customer info strip */}
              {selectedCustomer && (
                <div className="mt-3 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-800/60 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Destination</span>
                    <span className="text-sm font-semibold text-white">{selectedCustomer.country}</span>
                  </div>
                  {(selectedCustomer.zoneCode || selectedCustomer.zone) && (
                    <div className="bg-slate-800/30 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                      <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Zone</span>
                      <span className="text-sm font-mono font-bold text-[#f472b6]">
                        {selectedCustomer.zoneCode || selectedCustomer.zone}
                      </span>
                    </div>
                  )}
                  <div className="bg-slate-800/30 px-4 py-2 flex justify-between items-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Quote currency</span>
                    <span className="text-sm font-bold text-[#f472b6]">
                      {isAUorZA ? ic : officeCurrency} {SYMBOLS[isAUorZA ? ic : officeCurrency]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Shipment details ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-4">Shipment details</div>

              {/* Goods value */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">
                  Invoice value ({isAUorZA ? ic : officeCurrency})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-semibold text-sm pointer-events-none">
                    {SYMBOLS[isAUorZA ? ic : officeCurrency] || (isAUorZA ? ic : officeCurrency)}
                  </span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={form.valueInput}
                    onChange={e => update("valueInput", e.target.value)}
                    className="w-full pl-8 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg py-3 text-sm focus:outline-none focus:border-[#C4006A] transition-colors placeholder-slate-600"
                  />
                </div>
                {!isAUorZA && ic !== officeCurrency && valueGBP !== null && form.valueInput && (
                  <div className="text-xs text-slate-500 mt-1.5 flex justify-between">
                    <span>≈ £{valueGBP.toFixed(2)} GBP</span>
                    <span>Rate: 1 GBP = {rate1GBP?.toFixed(4)} {ic}</span>
                  </div>
                )}
              </div>

              {/* Weight / Pieces / CBM row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Weight (kg)</label>
                  <input
                    type="number" placeholder="0" value={form.weight}
                    onChange={e => update("weight", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#C4006A] transition-colors placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Pieces</label>
                  <input
                    type="number" placeholder="0" value={form.pieces}
                    onChange={e => update("pieces", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#C4006A] transition-colors placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">CBM</label>
                  <input
                    type="number" placeholder="0.00" value={form.cbm}
                    onChange={e => update("cbm", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#C4006A] transition-colors placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Transport */}
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Transport mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Courier","Air","Sea"].map(mode => (
                    <button
                      key={mode}
                      onClick={() => update("transport", mode)}
                      className={`py-3 rounded-lg text-sm font-semibold border transition-all ${
                        form.transport === mode
                          ? "border-[#C4006A] bg-[#C4006A]/15 text-[#f472b6] shadow-[0_0_12px_rgba(196,0,106,0.15)]"
                          : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {mode === "Courier" ? "📦 Courier" : mode === "Air" ? "✈ Air" : "🚢 Sea"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={calculate}
              disabled={ratesLoading}
              className="w-full py-4 bg-[#C4006A] hover:bg-[#a3005a] disabled:opacity-50 rounded-xl font-bold text-base tracking-wide transition-all shadow-[0_4px_20px_rgba(196,0,106,0.3)] hover:shadow-[0_4px_28px_rgba(196,0,106,0.45)]"
            >
              {ratesLoading ? "Loading rates…" : "Calculate Quote"}
            </button>
          </div>

          {/* ══ RESULTS ══ */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            {!result ? (
              <div className="text-slate-500 text-sm text-center py-16">
                Select a customer and fill in the details to generate a quote
              </div>
            ) : (
              <ResultPanel
                result={result}
                customer={selectedCustomer}
                form={form}
                rates={rates}
                officeCurrency={isAUorZA ? result.currency : officeCurrency}
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

/* ── Result panel ────────────────────────────────────────── */
function ResultPanel({ result, customer, form, rates, officeCurrency, onSave, saving }) {
  const currency = result.currency || officeCurrency;
  const sym      = SYMBOLS[currency] || currency;
  const fmt      = v => Number(v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-700 pb-3">
        <div className="font-bold text-lg">{customer?.name}</div>
        <div className="text-slate-400 text-sm">{result.country} · {form.transport} · {currency}</div>
        {result.zone ? <div className="text-slate-400 text-sm">Zone: {result.zone}</div> : null}
        {result.note  && !result.note.includes("Duty payable") && (
          <div className="text-amber-400 text-xs mt-1 leading-relaxed">{result.note}</div>
        )}
        {result.error && <div className="text-red-400 text-xs mt-1">{result.error}</div>}
      </div>

      {/* Goods value */}
      <div className="bg-slate-800 rounded-lg p-3 flex justify-between text-sm">
        <span className="text-slate-400">Goods value entered</span>
        <span className="font-semibold">{SYMBOLS[result._inputCurrency]}{fmt(result._valueInput)} {result._inputCurrency}</span>
      </div>

      {/* C&D Total */}
      <div className="bg-[#C4006A]/10 border border-[#C4006A]/40 rounded-xl p-4">
        <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">C&D Total</div>
        <div className="text-4xl font-bold text-[#f472b6]">{sym}{fmt(result.total)}</div>
        <div className="text-xs text-slate-500 mt-1">{currency} · All clearance and delivery charges</div>
      </div>

      {/* Duty box — separate */}
      {result.duty > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4">
          <div className="text-xs text-amber-400 mb-1 uppercase tracking-wide">Duty</div>
          <div className="text-2xl font-bold text-amber-300">{sym}{fmt(result.duty)}</div>
          <div className="text-xs text-slate-500 mt-1">Not included in C&D total above</div>
        </div>
      )}

      {/* Breakdown */}
      {result.breakdown && Object.keys(result.breakdown).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Breakdown ({currency})</div>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(result.breakdown).map(([k, v]) =>
                typeof v === "number" && !k.startsWith("Exchange rate") ? (
                  <tr key={k} className="border-b border-slate-800/60">
                    <td className="py-1.5 text-slate-400 text-xs">{k}</td>
                    <td className="py-1.5 text-right font-mono text-xs">{sym}{fmt(v)}</td>
                  </tr>
                ) : typeof v === "string" ? (
                  <tr key={k} className="border-b border-slate-800/60">
                    <td className="py-1.5 text-slate-500 text-xs" colSpan={2}>{k}: {v}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FX note */}
      {result._fxDate && (
        <div className="text-xs text-slate-600">Exchange rates: {result._fxDate}</div>
      )}

      <button onClick={onSave} disabled={saving}
        className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg font-semibold text-sm">
        {saving ? "Saving…" : "Save Quote to History"}
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A] transition-colors placeholder-slate-500"
      />
    </div>
  );
}
