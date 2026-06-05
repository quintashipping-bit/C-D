import React, { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

const COUNTRIES = ["Australia","South Africa","Saudi Arabia","Qatar","Singapore","Namibia","Other"];

const AU_ZONES = [
  { code: "",    label: "— Select zone —" },
  { code: "NN1", label: "NN1 — Sydney / Canberra / Newcastle / Wollongong" },
  { code: "NN2", label: "NN2 — Coffs Harbour / Lismore / Port Macquarie" },
  { code: "NN3", label: "NN3 — Nowra" },
  { code: "NN4", label: "NN4 — Armidale / Tamworth" },
  { code: "NN5", label: "NN5 — Albury / Wodonga / Wagga Wagga" },
  { code: "NN6", label: "NN6 — Dubbo / Orange" },
  { code: "NT1", label: "NT1 — Darwin / Katherine" },
  { code: "NT2", label: "NT2 — Alice Springs / Tennant Creek" },
  { code: "NT3", label: "NT3 — Gove / Kununurra" },
  { code: "QQ1", label: "QQ1 — Brisbane / Gold Coast / Toowoomba" },
  { code: "QQ2", label: "QQ2 — Rockhampton / Bundaberg / Emerald" },
  { code: "QQ3", label: "QQ3 — Cairns / Townsville / Mackay" },
  { code: "QQ4", label: "QQ4 — Mount Isa" },
  { code: "QQ5", label: "QQ5 — Far remote Queensland" },
  { code: "SS1", label: "SS1 — Adelaide" },
  { code: "SS2", label: "SS2 — Mount Gambier / Broken Hill" },
  { code: "SS3", label: "SS3 — Far remote South Australia" },
  { code: "TA1", label: "TA1 — Hobart / Launceston" },
  { code: "TA2", label: "TA2 — Far remote Tasmania" },
  { code: "VV1", label: "VV1 — Melbourne / Geelong" },
  { code: "VV2", label: "VV2 — Ballarat / Bendigo / Shepparton" },
  { code: "VV3", label: "VV3 — Far remote Victoria" },
  { code: "WW1", label: "WW1 — Perth / Bunbury / Geraldton / Kalgoorlie" },
  { code: "WW2", label: "WW2 — Far remote Perth metro" },
  { code: "WW3", label: "WW3 — Broome / Port Hedland / Karratha / Newman" },
  { code: "WW4", label: "WW4 — Leinster / far remote WA" },
];

const AU_ZONE_LOOKUP = {
  "AGL MACQUARIE GENERATION":"NN1","AGL TORRENS ISLAND POWER":"SS1",
  "AMPOL LYTTON REFINERY":"QQ1","ARROW ENERGY":"QQ4","BEACH ENERGY":"VV1",
  "BHP BILLITON - OLYMPIC DAM":"SS1","BLUEWATERS POWER STATION":"WW2",
  "CEMENT AUSTRALIA (RAILTON)":"QQ1","CS ENERGY (CALLIDE DAM)":"QQ4",
  "CS ENERGY KOGAN CREEK":"QQ1","DIAMANTINA PS":"QQ4",
  "ENERGYAUSTRALIA (JEERALANG)":"VV1","ENERGYAUSTRALIA (TALLAWARRA)":"NN1",
  "ENERGYAUSTRALIA (YALLOURN)":"VV1","ENGIE AUS (PELICAN POINT)":"SS1",
  "ESSO AUSTRALIA":"VV1","GLENCORE (MOUNT ISA)":"QQ4","LIBERTY GFG":"SS1",
  "LION FOODS":"VV1","MILLMERRAN POWER STATION":"QQ1","NEWGEN KWINANA":"WW1",
  "NRG GLADSTONE":"QQ2","NYRSTAR - PORT PIRIE":"SS1","OAKEY POWER STATION":"QQ1",
  "OK TEDI":"QQ1","ORIGIN ENERGY (CONDABRI DISTRIBUTION CENTRE)":"QQ2",
  "ORIGIN ENERGY (MOUNT STUART POWER STATION)":"QQ3",
  "ORIGIN ENERGY (QUARANTINE POWER STATION)":"SS1","QNP":"QQ4",
  "QUEENSLAND ALUMINA":"QQ2","RIO TINTO ALUMINIUM YARWUN":"QQ2","SANTOS":"SS1",
  "SIMPLOT AUSTRALIA PTY LTD":"TA1","SNOWY HYDRO (COLONGRA PS)":"NN1",
  "SOLSTAD":"WW1","SOUTH32 (WORSLEY ALUMINA)":"WW2","STANWELL (SWANBANK)":"QQ2",
  "STANWELL (TARONG PS)":"QQ1","STANWELL POWER STATION":"QQ2",
  "VIVA ENERGY (GEELONG)":"VV1","YARA PILBARA FERTILISERS":"WW1",
};

function resolveZone(c) {
  if (c.zoneCode) return c.zoneCode;
  const z = String(c.zone || "").trim().toUpperCase();
  if (z && isNaN(z)) return z;
  return "";
}

const EMPTY_FORM = {
  name:"", country:"", contact:"", email:"", phone:"",
  zoneCode:"", zone:"", rateKg:"", surcharge:"", notes:"",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId]       = useState(null);   // which customer is being edited
  const [saving, setSaving]       = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  const isAU = form.country?.toLowerCase() === "australia";
  const isZA = form.country?.toLowerCase() === "south africa";

  useEffect(() => { load(); }, []);

  async function load() {
    const snap = await getDocs(collection(db, "customers"));
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowAddForm(false);
  }

  function startEdit(customer) {
    const normCountry = COUNTRIES.find(
      opt => opt.toLowerCase() === (customer.country || "").toLowerCase()
    ) || customer.country || "";
    setForm({
      name:      customer.name      || "",
      country:   normCountry,
      contact:   customer.contact   || "",
      email:     customer.email     || "",
      phone:     customer.phone     || "",
      zoneCode:  resolveZone(customer),
      zone:      customer.zone      ?? "",
      rateKg:    customer.rateKg    ?? "",
      surcharge: customer.surcharge ?? "",
      notes:     customer.notes     || "",
    });
    setEditId(customer.id);
    setShowAddForm(false); // close add form if open
  }

  function handleNameChange(name) {
    const zoneCode = isAU ? (AU_ZONE_LOOKUP[name.trim().toUpperCase()] || form.zoneCode) : form.zoneCode;
    setForm(p => ({ ...p, name, zoneCode }));
  }

  function handleCountryChange(country) {
    const zoneCode = country.toLowerCase() === "australia"
      ? (AU_ZONE_LOOKUP[form.name.trim().toUpperCase()] || form.zoneCode)
      : form.zoneCode;
    setForm(p => ({ ...p, country, zoneCode }));
  }

  async function save() {
    if (!form.name.trim()) { alert("Name required"); return; }
    setSaving(true);
    const base = {
      name: form.name.trim(), country: form.country,
      contact: form.contact, email: form.email,
      phone: form.phone, notes: form.notes,
    };
    if (form.country?.toLowerCase() === "australia") {
      Object.assign(base, { zoneCode: form.zoneCode, zone: form.zoneCode, rateKg: 0, surcharge: 0 });
    } else {
      Object.assign(base, {
        zoneCode: "",
        zone:      Number(form.zone)      || 0,
        rateKg:    Number(form.rateKg)    || 0,
        surcharge: Number(form.surcharge) || 0,
      });
    }
    if (editId) {
      await updateDoc(doc(db, "customers", editId), base);
    } else {
      await addDoc(collection(db, "customers"), { ...base, createdAt: serverTimestamp() });
    }
    setSaving(false); resetForm(); load();
  }

  async function remove(id) {
    if (!confirm("Delete this customer?")) return;
    await deleteDoc(doc(db, "customers", id)); load();
  }

  async function migrateZones() {
    const auNoZone = customers.filter(c =>
      (c.country || "").toLowerCase() === "australia" && !resolveZone(c)
    );
    if (auNoZone.length === 0) { alert("All Australian customers already have a zone set."); return; }
    if (!confirm(`Auto-match zones for ${auNoZone.length} Australian customer(s) from the Excel lookup?\nUnmatched ones will need manual assignment.`)) return;
    setMigrating(true);
    let matched = 0;
    for (const c of auNoZone) {
      const zone = AU_ZONE_LOOKUP[c.name?.trim().toUpperCase()];
      if (zone) { await updateDoc(doc(db, "customers", c.id), { zoneCode: zone, zone }); matched++; }
    }
    setMigrating(false);
    alert(`Done. ${matched} matched. ${auNoZone.length - matched} still need manual zone assignment.`);
    load();
  }

  const filtered = customers.filter(c =>
    !search.trim() ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.country?.toLowerCase().includes(search.toLowerCase())
  );

  const auNoZone = customers.filter(c =>
    (c.country || "").toLowerCase() === "australia" && !resolveZone(c)
  ).length;

  // Inline edit form JSX — reused inside the table
  const EditForm = () => (
    <div className="bg-slate-800 border-t border-b border-[#C4006A]/50 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#f472b6]">Editing: {form.name}</h3>
        <button onClick={resetForm} className="text-slate-400 hover:text-white text-xs">✕ Cancel</button>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <FormField label="Name *"        value={form.name}    onChange={v => handleNameChange(v)} />
        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Country</label>
          <select
            value={form.country}
            onChange={e => handleCountryChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A]"
          >
            <option value="" className="bg-slate-900">— Select —</option>
            {COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
        </div>
        <FormField label="Contact"   value={form.contact}   onChange={v => setForm(p => ({...p, contact: v}))} />
        <FormField label="Email"     value={form.email}     onChange={v => setForm(p => ({...p, email: v}))}   type="email" />
        <FormField label="Phone"     value={form.phone}     onChange={v => setForm(p => ({...p, phone: v}))} />
      </div>

      {/* Australia zone */}
      {isAU && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-4">
          <div className="text-xs text-slate-300 font-semibold uppercase tracking-wide mb-3">Australia Delivery Zone</div>
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Zone code</label>
              <select
                value={form.zoneCode}
                onChange={e => setForm(p => ({...p, zoneCode: e.target.value}))}
                className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A]"
                size={1}
              >
                {AU_ZONES.map(z => (
                  <option key={z.code} value={z.code} className="bg-slate-900 text-slate-100 py-1">
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-400">
              {AU_ZONE_LOOKUP[form.name.trim().toUpperCase()]
                ? <span className="text-green-400">✓ Auto-matched: <strong>{AU_ZONE_LOOKUP[form.name.trim().toUpperCase()]}</strong></span>
                : "Select the zone matching this customer's delivery location."}
            </div>
          </div>
        </div>
      )}

      {/* South Africa */}
      {isZA && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-4">
          <div className="text-xs text-slate-300 font-semibold uppercase tracking-wide mb-3">South Africa Delivery Rates</div>
          <div className="grid md:grid-cols-3 gap-3">
            <FormField label="Zone base rate (ZAR)" value={form.zone}      onChange={v => setForm(p => ({...p, zone: v}))}      type="number" />
            <FormField label="Rate per kg (ZAR)"     value={form.rateKg}    onChange={v => setForm(p => ({...p, rateKg: v}))}    type="number" />
            <FormField label="Surcharge (ZAR)"       value={form.surcharge} onChange={v => setForm(p => ({...p, surcharge: v}))} type="number" />
          </div>
        </div>
      )}

      <FormField label="Notes" value={form.notes} onChange={v => setForm(p => ({...p, notes: v}))} />

      <div className="flex gap-3 mt-4">
        <button onClick={save} disabled={saving}
          className="px-5 py-2 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg text-sm font-semibold">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={resetForm}
          className="px-5 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Customers</h1>
            {auNoZone > 0 && (
              <p className="text-amber-400 text-xs mt-1">
                ⚠ {auNoZone} Australian customer{auNoZone !== 1 ? "s" : ""} missing zone code
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {auNoZone > 0 && (
              <button onClick={migrateZones} disabled={migrating}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm font-medium">
                {migrating ? "Fixing…" : `Fix ${auNoZone} AU zones`}
              </button>
            )}
            <button
              onClick={() => { resetForm(); setShowAddForm(p => !p); }}
              className="px-4 py-2 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg text-sm font-semibold"
            >
              {showAddForm ? "✕ Cancel" : "+ Add Customer"}
            </button>
          </div>
        </div>

        {/* Add form — only shown at top when adding new */}
        {showAddForm && !editId && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-5">
            <h2 className="text-base font-semibold mb-4">Add Customer</h2>
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <FormField label="Name *"  value={form.name}    onChange={v => handleNameChange(v)} />
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Country</label>
                <select value={form.country} onChange={e => handleCountryChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A]">
                  <option value="" className="bg-slate-900">— Select —</option>
                  {COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
              </div>
              <FormField label="Contact" value={form.contact} onChange={v => setForm(p => ({...p, contact: v}))} />
              <FormField label="Email"   value={form.email}   onChange={v => setForm(p => ({...p, email: v}))}   type="email" />
              <FormField label="Phone"   value={form.phone}   onChange={v => setForm(p => ({...p, phone: v}))} />
            </div>

            {isAU && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-300 font-semibold uppercase tracking-wide mb-3">Australia Delivery Zone</div>
                <select value={form.zoneCode}
                  onChange={e => setForm(p => ({...p, zoneCode: e.target.value}))}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A]">
                  {AU_ZONES.map(z => <option key={z.code} value={z.code} className="bg-slate-900 text-slate-100">{z.label}</option>)}
                </select>
              </div>
            )}
            {isZA && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-300 font-semibold uppercase tracking-wide mb-3">South Africa Delivery Rates</div>
                <div className="grid md:grid-cols-3 gap-3">
                  <FormField label="Zone base rate (ZAR)" value={form.zone}      onChange={v => setForm(p => ({...p, zone: v}))}      type="number" />
                  <FormField label="Rate per kg (ZAR)"     value={form.rateKg}    onChange={v => setForm(p => ({...p, rateKg: v}))}    type="number" />
                  <FormField label="Surcharge (ZAR)"       value={form.surcharge} onChange={v => setForm(p => ({...p, surcharge: v}))} type="number" />
                </div>
              </div>
            )}
            <FormField label="Notes" value={form.notes} onChange={v => setForm(p => ({...p, notes: v}))} />
            <div className="flex gap-3 mt-4">
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg text-sm font-semibold">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={resetForm}
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Search */}
        <input
          className="w-full mb-5 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A] placeholder-slate-500"
          placeholder="Search by name or country…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Name","Country","Contact","Email","Zone / Delivery","Actions"].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide ${h==="Actions"?"text-right":"text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(customer => {
                const zc = resolveZone(customer);
                const isAustralia = (customer.country || "").toLowerCase() === "australia";
                const isBeingEdited = editId === customer.id;

                return (
                  <React.Fragment key={customer.id}>
                    {/* Customer row */}
                    <tr className={`border-b border-slate-800/50 transition-colors ${isBeingEdited ? "bg-slate-800/60" : "hover:bg-slate-800/30"}`}>
                      <td className="px-4 py-3 font-medium">{customer.name}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{customer.country}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{customer.contact || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{customer.email || "—"}</td>
                      <td className="px-4 py-3">
                        {isAustralia ? (
                          zc
                            ? <span className="text-xs px-2 py-1 rounded font-mono font-bold bg-[#C4006A]/20 text-[#f472b6] border border-[#C4006A]/30">{zc}</span>
                            : <span className="text-xs px-2 py-1 rounded bg-amber-900/40 text-amber-400 border border-amber-800">⚠ No zone</span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {[
                              customer.zone      ? `Base: ${customer.zone}`      : null,
                              customer.rateKg    ? `${customer.rateKg}/kg`       : null,
                              customer.surcharge ? `+${customer.surcharge}`      : null,
                            ].filter(Boolean).join(" · ") || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => isBeingEdited ? resetForm() : startEdit(customer)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              isBeingEdited
                                ? "bg-[#C4006A]/20 text-[#f472b6] border border-[#C4006A]/40"
                                : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                            }`}
                          >
                            {isBeingEdited ? "Close" : "Edit"}
                          </button>
                          <button onClick={() => remove(customer.id)}
                            className="px-3 py-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 rounded text-xs">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline edit form — directly below the edited row */}
                    {isBeingEdited && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <EditForm />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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

function FormField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#C4006A] transition-colors placeholder-slate-500"
      />
    </div>
  );
}
