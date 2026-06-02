import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

const COUNTRIES = ["Australia","South Africa","Saudi Arabia","Qatar","Singapore","Namibia","Other"];

const AU_ZONES = [
  { code: "", label: "— Select zone —" },
  { code: "TA1", label: "TA1 — Tasmania" },
  { code: "NN1", label: "NN1 — Sydney" },
  { code: "QQ1", label: "QQ1 — Brisbane" },
  { code: "SS1", label: "SS1 — Adelaide" },
  { code: "WW1", label: "WW1 — Perth" },
  { code: "VV1", label: "VV1 — Melbourne" },
  { code: "QQ2", label: "QQ2 — Brisbane 2 (outer)" },
  { code: "QQ3", label: "QQ3 — Brisbane 3 (remote)" },
  { code: "QQ4", label: "QQ4 — Brisbane 4 (far remote)" },
  { code: "WW2", label: "WW2 — Perth 2 (outer)" },
];

// Customer-zone mapping from Excel sheet rows 33-74
const AU_CUSTOMER_ZONES = {
  "AGL MACQUARIE GENERATION": "NN1",
  "AGL TORRENS ISLAND POWER": "SS1",
  "AMPOL LYTTON REFINERY": "QQ1",
  "ARROW ENERGY": "QQ4",
  "BEACH ENERGY": "VV1",
  "BHP BILLITON - OLYMPIC DAM": "SS1",
  "BLUEWATERS POWER STATION": "WW2",
  "CEMENT AUSTRALIA (RAILTON)": "QQ1",
  "CS ENERGY (CALLIDE DAM)": "QQ4",
  "CS ENERGY KOGAN CREEK": "QQ1",
  "DIAMANTINA PS": "QQ4",
  "ENERGYAUSTRALIA (JEERALANG)": "VV1",
  "ENERGYAUSTRALIA (TALLAWARRA)": "NN1",
  "ENERGYAUSTRALIA (YALLOURN)": "VV1",
  "ENGIE AUS (PELICAN POINT)": "SS1",
  "ESSO AUSTRALIA": "VV1",
  "GLENCORE (MOUNT ISA)": "QQ4",
  "LIBERTY GFG": "SS1",
  "LION FOODS": "VV1",
  "MILLMERRAN POWER STATION": "QQ1",
  "NEWGEN KWINANA": "WW1",
  "NRG GLADSTONE": "QQ2",
  "NYRSTAR - PORT PIRIE": "SS1",
  "OAKEY POWER STATION": "QQ1",
  "OK TEDI": "QQ1",
  "ORIGIN ENERGY (CONDABRI DISTRIBUTION CENTRE)": "QQ2",
  "ORIGIN ENERGY (MOUNT STUART POWER STATION)": "QQ3",
  "ORIGIN ENERGY (QUARANTINE POWER STATION)": "SS1",
  "QNP": "QQ4",
  "QUEENSLAND ALUMINA": "QQ2",
  "RIO TINTO ALUMINIUM YARWUN": "QQ2",
  "SANTOS": "SS1",
  "SIMPLOT AUSTRALIA PTY LTD": "TA1",
  "SNOWY HYDRO (COLONGRA PS)": "NN1",
  "SOLSTAD": "WW1",
  "SOUTH32 (WORSLEY ALUMINA)": "WW2",
  "STANWELL (SWANBANK)": "QQ2",
  "STANWELL (TARONG PS)": "QQ1",
  "STANWELL POWER STATION": "QQ2",
  "VIVA ENERGY (GEELONG)": "VV1",
  "YARA PILBARA FERTILISERS": "WW1",
};

const EMPTY_FORM = {
  name: "", country: "", contact: "", email: "", phone: "",
  // Australia fields
  zoneCode: "",
  // South Africa fields
  zone: "", rateKg: "", surcharge: "",
  // Shared
  notes: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  const isAustralia  = form.country === "Australia";
  const isSouthAfrica = form.country === "South Africa";

  useEffect(() => { load(); }, []);

  async function load() {
    const snap = await getDocs(collection(db, "customers"));
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c) {
    setForm({
      name:     c.name     || "",
      country:  c.country  || "",
      contact:  c.contact  || "",
      email:    c.email    || "",
      phone:    c.phone    || "",
      zoneCode: c.zoneCode || "",
      zone:     c.zone     ?? "",
      rateKg:   c.rateKg   ?? "",
      surcharge:c.surcharge ?? "",
      notes:    c.notes    || "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  // When country changes to Australia, try to auto-suggest zone from name
  function handleCountryChange(country) {
    let zoneCode = form.zoneCode;
    if (country === "Australia" && form.name) {
      const match = AU_CUSTOMER_ZONES[form.name.toUpperCase().trim()];
      if (match) zoneCode = match;
    }
    setForm(p => ({ ...p, country, zoneCode }));
  }

  // When name changes on an Australia customer, auto-fill zone if known
  function handleNameChange(name) {
    let zoneCode = form.zoneCode;
    if (form.country === "Australia") {
      const match = AU_CUSTOMER_ZONES[name.toUpperCase().trim()];
      if (match) zoneCode = match;
    }
    setForm(p => ({ ...p, name, zoneCode }));
  }

  async function save() {
    if (!form.name.trim()) { alert("Name required"); return; }
    setSaving(true);

    const base = {
      name:    form.name.trim(),
      country: form.country,
      contact: form.contact,
      email:   form.email,
      phone:   form.phone,
      notes:   form.notes,
    };

    // Country-specific fields
    if (form.country === "Australia") {
      Object.assign(base, {
        zoneCode: form.zoneCode || "",
        zone:     form.zoneCode || "",  // keep zone alias for backward compat
        rateKg:   0,
        surcharge:0,
      });
    } else {
      Object.assign(base, {
        zoneCode: "",
        zone:     Number(form.zone)      || 0,
        rateKg:   Number(form.rateKg)    || 0,
        surcharge:Number(form.surcharge) || 0,
      });
    }

    if (editId) {
      await updateDoc(doc(db, "customers", editId), base);
    } else {
      await addDoc(collection(db, "customers"), { ...base, createdAt: serverTimestamp() });
    }
    setSaving(false);
    resetForm();
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this customer?")) return;
    await deleteDoc(doc(db, "customers", id));
    load();
  }

  const filtered = customers.filter(c =>
    !search.trim() ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-[#C4006A] hover:bg-[#a3005a] px-4 py-2 rounded-lg text-sm font-semibold">
            + Add Customer
          </button>
        </div>

        <input className="w-full mb-5"
          placeholder="Search by name or country…"
          value={search} onChange={e => setSearch(e.target.value)} />

        {/* ── Form ── */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold mb-4">{editId ? "Edit" : "Add"} Customer</h2>

            {/* Core fields */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Name *</label>
                <input value={form.name} onChange={e => handleNameChange(e.target.value)}
                  className="w-full" placeholder="Customer name" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Country</label>
                <select value={form.country} onChange={e => handleCountryChange(e.target.value)} className="w-full">
                  <option value="">— Select —</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Contact name" value={form.contact} onChange={v => setForm(p => ({...p, contact: v}))} />
              <Field label="Email"  value={form.email}  onChange={v => setForm(p => ({...p, email: v}))}  type="email" />
              <Field label="Phone"  value={form.phone}  onChange={v => setForm(p => ({...p, phone: v}))} />
            </div>

            {/* ── Australia zone picker ── */}
            {isAustralia && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
                  Australia Delivery Zone
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Zone code</label>
                    <select value={form.zoneCode}
                      onChange={e => setForm(p => ({...p, zoneCode: e.target.value}))}
                      className="w-full">
                      {AU_ZONES.map(z => (
                        <option key={z.code} value={z.code}>{z.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Zone determines local delivery cost. T76 and S76 rates are
                      in Settings → Australia. The cheaper service is used automatically.
                      {form.name && AU_CUSTOMER_ZONES[form.name.toUpperCase().trim()] && (
                        <span className="block mt-1 text-green-400">
                          ✓ Zone auto-matched from Excel: <strong>{AU_CUSTOMER_ZONES[form.name.toUpperCase().trim()]}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── South Africa rate fields ── */}
            {isSouthAfrica && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
                  South Africa Delivery Rates
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Zone (delivery base, ZAR)" value={form.zone}      onChange={v => setForm(p => ({...p, zone: v}))}      type="number" />
                  <Field label="Rate per kg (ZAR)"         value={form.rateKg}    onChange={v => setForm(p => ({...p, rateKg: v}))}    type="number" />
                  <Field label="Surcharge (ZAR)"           value={form.surcharge} onChange={v => setForm(p => ({...p, surcharge: v}))} type="number" />
                </div>
              </div>
            )}

            <Field label="Notes" value={form.notes} onChange={v => setForm(p => ({...p, notes: v}))} />

            <div className="flex gap-3 mt-4">
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg text-sm font-semibold">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={resetForm}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Customer list ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Name","Country","Contact","Email","Zone / Delivery info","Actions"].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide ${h==="Actions"?"text-right":"text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400">{c.country}</td>
                  <td className="px-4 py-3 text-slate-400">{c.contact || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    {c.country === "Australia" ? (
                      <span className={`text-xs px-2 py-1 rounded font-mono font-bold ${
                        c.zoneCode
                          ? "bg-[#C4006A]/20 text-[#f472b6] border border-[#C4006A]/30"
                          : "bg-amber-900/30 text-amber-400 border border-amber-800"
                      }`}>
                        {c.zoneCode || "⚠ No zone set"}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        {c.zone ? `Zone: ${c.zone}` : ""}
                        {c.rateKg ? ` · ${c.rateKg}/kg` : ""}
                        {c.surcharge ? ` · +${c.surcharge}` : ""}
                        {!c.zone && !c.rateKg ? "—" : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => startEdit(c)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">Edit</button>
                      <button onClick={() => remove(c.id)}
                        className="px-3 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded text-xs">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-slate-400 text-center py-12 text-sm">No customers found.</div>
          )}
        </div>

      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full" />
    </div>
  );
}
