import { useEffect, useState } from "react";
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

// Resolve zone code from a customer record — handles old and new formats
function resolveZone(c) {
  if (c.zoneCode) return c.zoneCode;
  // Old format: zone was stored as a string zone code
  const z = String(c.zone || "").trim().toUpperCase();
  if (z && isNaN(z)) return z; // e.g. "VV1"
  return ""; // numeric or empty — no zone code
}

const EMPTY_FORM = {
  name:"", country:"", contact:"", email:"", phone:"",
  zoneCode:"", zone:"", rateKg:"", surcharge:"", notes:"",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
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

  function resetForm() { setForm(EMPTY_FORM); setEditId(null); setShowForm(false); }

  function startEdit(c) {
    // Normalise country to match dropdown values (title case)
    const normCountry = COUNTRIES.find(
      opt => opt.toLowerCase() === (c.country || "").toLowerCase()
    ) || c.country || "";
    setForm({
      name:      c.name      || "",
      country:   normCountry,
      contact:   c.contact   || "",
      email:     c.email     || "",
      phone:     c.phone     || "",
      zoneCode:  resolveZone(c),
      zone:      c.zone      ?? "",
      rateKg:    c.rateKg    ?? "",
      surcharge: c.surcharge ?? "",
      notes:     c.notes     || "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleNameChange(name) {
    const zoneCode = (form.country?.toLowerCase() === "australia")
      ? (AU_ZONE_LOOKUP[name.trim().toUpperCase()] || form.zoneCode)
      : form.zoneCode;
    setForm(p => ({ ...p, name, zoneCode }));
  }

  function handleCountryChange(country) {
    const zoneCode = (country?.toLowerCase() === "australia")
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
      Object.assign(base, {
        zoneCode:  form.zoneCode,
        zone:      form.zoneCode, // keep in sync
        rateKg:    0, surcharge: 0,
      });
    } else {
      Object.assign(base, {
        zoneCode:  "",
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

  // Fix all existing Australian customers that have no zoneCode set
  async function migrateZones() {
    const auCustomers = customers.filter(c =>
      (c.country || "").toLowerCase() === "australia" && !resolveZone(c)
    );
    if (auCustomers.length === 0) {
      alert("All Australian customers already have a zone code set.");
      return;
    }
    if (!confirm(
      `${auCustomers.length} Australian customer(s) have no zone code.\n\n` +
      `This will attempt to match them from the Excel zone lookup by name.\n` +
      `Unmatched customers will need to be set manually.\n\nContinue?`
    )) return;

    setMigrating(true);
    let matched = 0, unmatched = 0;
    for (const c of auCustomers) {
      const zone = AU_ZONE_LOOKUP[c.name?.trim().toUpperCase()];
      if (zone) {
        await updateDoc(doc(db, "customers", c.id), { zoneCode: zone, zone });
        matched++;
      } else {
        unmatched++;
      }
    }
    setMigrating(false);
    alert(`Done. ${matched} matched automatically. ${unmatched} still need manual zone assignment.`);
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

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Customers</h1>
            {auNoZone > 0 && (
              <p className="text-amber-400 text-xs mt-1">
                ⚠ {auNoZone} Australian customer{auNoZone !== 1 ? "s" : ""} missing zone code — delivery cannot be calculated
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
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg text-sm font-semibold">
              + Add Customer
            </button>
          </div>
        </div>

        <input className="w-full mb-5" placeholder="Search by name or country…"
          value={search} onChange={e => setSearch(e.target.value)} />

        {/* ── Form ── */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold mb-4">{editId ? "Edit" : "Add"} Customer</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Name *</label>
                <input value={form.name} onChange={e => handleNameChange(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Country</label>
                <select value={form.country} onChange={e => handleCountryChange(e.target.value)} className="w-full">
                  <option value="">— Select —</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Contact name" value={form.contact} onChange={v => setForm(p => ({...p, contact: v}))} />
              <Field label="Email" value={form.email} onChange={v => setForm(p => ({...p, email: v}))} type="email" />
              <Field label="Phone" value={form.phone} onChange={v => setForm(p => ({...p, phone: v}))} />
            </div>

            {/* Australia zone */}
            {isAU && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-300 font-semibold uppercase tracking-wide mb-3">
                  Australia Delivery Zone
                </div>
                <div className="grid md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Zone code</label>
                    <select value={form.zoneCode}
                      onChange={e => setForm(p => ({...p, zoneCode: e.target.value}))}
                      className="w-full">
                      {AU_ZONES.map(z => <option key={z.code} value={z.code}>{z.label}</option>)}
                    </select>
                  </div>
                  <div className="text-xs text-slate-400 pb-1">
                    {AU_ZONE_LOOKUP[form.name.trim().toUpperCase()]
                      ? <span className="text-green-400">✓ Auto-matched from spreadsheet: <strong>{AU_ZONE_LOOKUP[form.name.trim().toUpperCase()]}</strong></span>
                      : "Select the zone that matches this customer's delivery location."}
                  </div>
                </div>
              </div>
            )}

            {/* South Africa rates */}
            {isZA && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-300 font-semibold uppercase tracking-wide mb-3">
                  South Africa Delivery Rates
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Zone base rate (ZAR)" value={form.zone}      onChange={v => setForm(p => ({...p, zone: v}))}      type="number" />
                  <Field label="Rate per kg (ZAR)"     value={form.rateKg}    onChange={v => setForm(p => ({...p, rateKg: v}))}    type="number" />
                  <Field label="Surcharge (ZAR)"       value={form.surcharge} onChange={v => setForm(p => ({...p, surcharge: v}))} type="number" />
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
                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
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
              {filtered.map(c => {
                const zc = resolveZone(c);
                const isAustralia = (c.country||"").toLowerCase() === "australia";
                return (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{c.country}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{c.contact || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.email || "—"}</td>
                    <td className="px-4 py-3">
                      {isAustralia ? (
                        zc
                          ? <span className="text-xs px-2 py-1 rounded font-mono font-bold bg-[#C4006A]/20 text-[#f472b6] border border-[#C4006A]/30">{zc}</span>
                          : <span className="text-xs px-2 py-1 rounded bg-amber-900/40 text-amber-400 border border-amber-800">⚠ No zone</span>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {[
                            c.zone     ? `Base: ${c.zone}`     : null,
                            c.rateKg   ? `${c.rateKg}/kg`      : null,
                            c.surcharge? `+${c.surcharge}`     : null,
                          ].filter(Boolean).join(" · ") || "—"}
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

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full" />
    </div>
  );
}
