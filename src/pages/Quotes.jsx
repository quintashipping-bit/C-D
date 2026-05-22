import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

import { calculateAustralia }  from "../logic/australia";
import { calculateSouthAfrica } from "../logic/southAfricaLogic";
import { calculateSaudi }      from "../logic/saudi";
import { calculateQatar }      from "../logic/qatar";
import { calculateSingapore }  from "../logic/singapore";

export default function Quotes() {
  const [customers, setCustomers]           = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm]   = useState({ customerId: "", value: "", weight: "", pieces: "", cbm: "", transport: "Courier" });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  function update(name, value) { setForm(prev => ({ ...prev, [name]: value })); }

  function selectCustomer(id) {
    setSelectedCustomer(customers.find(c => c.id === id) || null);
    setForm(prev => ({ ...prev, customerId: id }));
    setResult(null);
  }

  function calculate() {
    if (!selectedCustomer) { alert("Select a customer first"); return; }
    const value  = Number(form.value  || 0);
    const weight = Number(form.weight || 0);
    const pieces = Number(form.pieces || 0);
    const cbm    = Number(form.cbm    || 0);
    const country = (selectedCustomer.country || "").toUpperCase().trim();
    let quote = null;

    if      (country === "AUSTRALIA")                        quote = calculateAustralia ({ customerName: selectedCustomer.name, value, weight, pieces, cbm, transport: form.transport });
    else if (country === "SOUTH AFRICA")                     quote = calculateSouthAfrica({ customerName: selectedCustomer.name, value, weight, pieces, cbm, transport: form.transport });
    else if (country === "SAUDI ARABIA" || country === "KSA") quote = calculateSaudi     ({ customerName: selectedCustomer.name, value, weight, pieces, cbm, transport: form.transport });
    else if (country === "QATAR")                            quote = calculateQatar     ({ customerName: selectedCustomer.name, value, weight, pieces, cbm, transport: form.transport });
    else if (country === "SINGAPORE")                        quote = calculateSingapore ({ customerName: selectedCustomer.name, value, weight, pieces, cbm, transport: form.transport });
    else quote = { country: selectedCustomer.country || "", currency: "GBP", zone: "", duty: 0, clearance: 0, delivery: 0, total: 0, note: "No logic configured for this country" };

    setResult(quote);
  }

  async function saveQuote() {
    if (!result || !selectedCustomer) return;
    setSaving(true);
    await addDoc(collection(db, "quotes"), {
      customerId: form.customerId,
      customerName: selectedCustomer.name,
      country: result.country,
      value: Number(form.value), weight: Number(form.weight),
      pieces: Number(form.pieces), cbm: Number(form.cbm),
      transport: form.transport,
      zone: result.zone || "",
      duty: result.duty || 0,
      clearance: result.clearance || 0,
      delivery: result.delivery || 0,
      total: result.total || 0,
      currency: result.currency || "GBP",
      breakdown: result.breakdown || {},
      status: "draft",
      createdAt: serverTimestamp()
    });
    setSaving(false);
    alert("Quote saved to history");
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">Quote Engine</h1>

        <div className="grid md:grid-cols-2 gap-8 items-start">

          {/* ── FORM ── */}
          <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Customer</label>
              <select className="w-full p-3 rounded-xl bg-zinc-800" value={form.customerId} onChange={e => selectCustomer(e.target.value)}>
                <option value="">— Select customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="bg-zinc-800 rounded-xl p-3 text-sm">
                <div className="text-zinc-400">Zone: <span className="text-white font-bold">{selectedCustomer.zone || "—"}</span></div>
                <div className="text-zinc-400">Rate/kg: <span className="text-white font-bold">{selectedCustomer.rateKg || "—"}</span></div>
                {selectedCustomer.surcharge > 0 && <div className="text-zinc-400">Surcharge: <span className="text-white font-bold">{selectedCustomer.surcharge}</span></div>}
              </div>
            )}

            <InputField label="Goods value (GBP)" placeholder="0.00" value={form.value} onChange={v => update("value", v)} type="number" />
            <InputField label="Weight (kg)"        placeholder="0"    value={form.weight} onChange={v => update("weight", v)} type="number" />
            <InputField label="Pieces"             placeholder="0"    value={form.pieces} onChange={v => update("pieces", v)} type="number" />
            <InputField label="CBM (sea only)"     placeholder="0.00" value={form.cbm}    onChange={v => update("cbm", v)} type="number" />

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Transport mode</label>
              <select className="w-full p-3 bg-zinc-800 rounded-xl" value={form.transport} onChange={e => update("transport", e.target.value)}>
                <option>Courier</option>
                <option>Air</option>
                <option>Sea</option>
              </select>
            </div>

            <button onClick={calculate} className="w-full bg-fuchsia-700 hover:bg-fuchsia-800 p-3 rounded-xl font-bold text-lg">
              Calculate Quote
            </button>
          </div>

          {/* ── RESULTS ── */}
          <div className="bg-zinc-900 p-6 rounded-2xl">
            {!result ? (
              <div className="text-zinc-400 text-center py-12">
                <div className="text-5xl mb-4">🧮</div>
                Fill in the form and calculate
              </div>
            ) : (
              <div className="space-y-4">

                {/* Summary header */}
                <div>
                  <div className="text-zinc-400 text-sm">{selectedCustomer?.name} — {result.country}</div>
                  <div className="text-zinc-400 text-sm">{form.transport} | {result.currency}</div>
                  {result.zone && <div className="text-zinc-400 text-sm">Zone: {result.zone}</div>}
                  {result.note && <div className="text-amber-400 text-sm mt-1">⚠ {result.note}</div>}
                  {result.error && <div className="text-red-400 text-sm mt-1">⚠ {result.error}</div>}
                </div>

                {/* Summary boxes */}
                <div className="grid grid-cols-3 gap-3">
                  <SummaryBox label="Duty" value={result.duty} currency={result.currency} />
                  <SummaryBox label="Clearance" value={result.clearance} currency={result.currency} />
                  <SummaryBox label="Delivery" value={result.delivery} currency={result.currency} />
                </div>

                {/* Total */}
                <div className="bg-fuchsia-950 border border-fuchsia-700 rounded-xl p-4">
                  <div className="text-sm text-zinc-400 mb-1">Total</div>
                  <div className="text-4xl font-bold text-fuchsia-400">
                    {result.currency} {Number(result.total || 0).toFixed(2)}
                  </div>
                </div>

                {/* Breakdown */}
                {result.breakdown && Object.keys(result.breakdown).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Breakdown</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(result.breakdown).map(([k, v]) => (
                          typeof v === "number" && v !== 0 ? (
                            <tr key={k} className="border-b border-zinc-800">
                              <td className="py-2 text-zinc-400 capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</td>
                              <td className="py-2 text-right font-mono">{Number(v).toFixed(2)}</td>
                            </tr>
                          ) : null
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={saveQuote}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold"
                >
                  {saving ? "Saving…" : "Save Quote to History"}
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
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

function SummaryBox({ label, value, currency }) {
  return (
    <div className="bg-zinc-800 rounded-xl p-3 text-center">
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className="font-bold">{Number(value || 0).toFixed(2)}</div>
      <div className="text-xs text-zinc-500">{currency}</div>
    </div>
  );
}
