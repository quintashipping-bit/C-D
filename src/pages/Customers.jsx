import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    country: "",
    contact: "",
    email: "",
    phone: "",
    zone: "",
    rateKg: "",
    surcharge: "",
    notes: ""
  });

  const COUNTRIES = [
    "Australia",
    "South Africa",
    "Saudi Arabia",
    "Qatar",
    "Singapore",
    "Namibia",
    "Other"
  ];

  useEffect(() => { load(); }, []);

  async function load() {
    const snap = await getDocs(collection(db, "customers"));
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  function resetForm() {
    setForm({ name: "", country: "", contact: "", email: "", phone: "", zone: "", rateKg: "", surcharge: "", notes: "" });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c) {
    setForm({
      name: c.name || "",
      country: c.country || "",
      contact: c.contact || "",
      email: c.email || "",
      phone: c.phone || "",
      zone: c.zone ?? "",
      rateKg: c.rateKg ?? "",
      surcharge: c.surcharge ?? "",
      notes: c.notes || ""
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { alert("Name required"); return; }
    setSaving(true);
    const data = {
      name: form.name.trim(),
      country: form.country,
      contact: form.contact,
      email: form.email,
      phone: form.phone,
      zone: Number(form.zone) || 0,
      rateKg: Number(form.rateKg) || 0,
      surcharge: Number(form.surcharge) || 0,
      notes: form.notes
    };
    if (editId) {
      await updateDoc(doc(db, "customers", editId), data);
    } else {
      await addDoc(collection(db, "customers"), { ...data, createdAt: serverTimestamp() });
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
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-fuchsia-700 hover:bg-fuchsia-800 px-4 py-2 rounded-xl font-bold"
          >
            + Add Customer
          </button>
        </div>

        <input
          className="w-full p-3 mb-6 rounded-xl bg-slate-800"
          placeholder="Search by name or country…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Form */}
        {showForm && (
          <div className="bg-slate-900 rounded-xl p-6 mb-6 border border-fuchsia-800">
            <h2 className="text-xl font-bold mb-4">{editId ? "Edit" : "Add"} Customer</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Field label="Name *" value={form.name} onChange={v => setForm(p => ({...p, name: v}))} />
              <div>
                <label className="block text-sm text-slate-400 mb-1">Country</label>
                <select
                  className="w-full p-3 rounded-xl bg-slate-800"
                  value={form.country}
                  onChange={e => setForm(p => ({...p, country: e.target.value}))}
                >
                  <option value="">— Select —</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Contact name" value={form.contact} onChange={v => setForm(p => ({...p, contact: v}))} />
              <Field label="Email" value={form.email} onChange={v => setForm(p => ({...p, email: v}))} />
              <Field label="Phone" value={form.phone} onChange={v => setForm(p => ({...p, phone: v}))} />
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Field label="Zone / delivery base rate" value={form.zone} type="number" onChange={v => setForm(p => ({...p, zone: v}))} />
              <Field label="Rate per kg" value={form.rateKg} type="number" onChange={v => setForm(p => ({...p, rateKg: v}))} />
              <Field label="Surcharge" value={form.surcharge} type="number" onChange={v => setForm(p => ({...p, surcharge: v}))} />
            </div>
            <Field label="Notes" value={form.notes} onChange={v => setForm(p => ({...p, notes: v}))} />
            <div className="flex gap-3 mt-4">
              <button onClick={save} disabled={saving} className="bg-fuchsia-700 hover:bg-fuchsia-800 px-6 py-2 rounded-xl font-bold">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={resetForm} className="bg-slate-700 hover:bg-zinc-600 px-6 py-2 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <div className="grid md:grid-cols-5 gap-4 items-center">
                <div>
                  <div className="font-bold text-lg">{c.name}</div>
                  <div className="text-slate-400 text-sm">{c.country}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Contact</div>
                  <div>{c.contact || "—"}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Email</div>
                  <div className="text-sm">{c.email || "—"}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Zone / Rate/kg</div>
                  <div>{c.zone || 0} / {c.rateKg || 0}</div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => startEdit(c)} className="bg-slate-700 hover:bg-zinc-600 px-3 py-1 rounded-lg text-sm">
                    Edit
                  </button>
                  <button onClick={() => remove(c.id)} className="bg-red-800 hover:bg-red-700 px-3 py-1 rounded-lg text-sm">
                    Delete
                  </button>
                </div>
              </div>
              {c.notes && <div className="mt-2 text-sm text-slate-400 border-t border-slate-800 pt-2">{c.notes}</div>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-slate-400 text-center py-12">No customers found. Add one above.</div>
          )}
        </div>

      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full p-3 rounded-xl bg-slate-800"
      />
    </div>
  );
}
