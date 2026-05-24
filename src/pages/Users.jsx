// src/pages/Users.jsx
// Admin-only: manage users, set roles and permissions
// Importing all users from the Excel spreadsheet as seed data

import { useEffect, useState } from "react";
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

/* ── Users from Excel sheet (excluding James Powell who is admin) ── */
const SEED_USERS = [
  { name: "Aaron Orchard",            email: "aaron@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Torben Siems",             email: "torben@qrgmbh.eu",             currency: "EUR", office: "GERMANY" },
  { name: "Adrian Muir",              email: "adrian@qrltd.co.uk",           currency: "GBP", office: "UK" },
  { name: "Adriane Bowers",           email: "adriane@qr-inc.com",           currency: "USD", office: "USA" },
  { name: "Tracy (Adriane)",          email: "tracy@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Alex Wenham",              email: "alex@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Alex Wenham (US)",         email: "sales@qr-inc.com",             currency: "USD", office: "USA" },
  { name: "Alexander Bosnali",        email: "alexander@qrgmbh.eu",          currency: "EUR", office: "GERMANY" },
  { name: "Yngvi (Alexander)",        email: "yngvi@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Andy Cowley",              email: "andy@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Zoe (Andy)",               email: "zoe@qrltd.co.uk",              currency: "GBP", office: "UK" },
  { name: "Anna Kloc",                email: "anna@qrgmbh.eu",               currency: "EUR", office: "GERMANY" },
  { name: "Basem Humod",              email: "warehouse@qrgmbh.eu",          currency: "EUR", office: "GERMANY" },
  { name: "Ben Rich",                 email: "ben@qrltd.co.uk",              currency: "GBP", office: "UK" },
  { name: "Bob Barr",                 email: "bob@qr-inc.com",               currency: "USD", office: "USA" },
  { name: "Bruce Dearlove",           email: "bruce@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Chris Roberts",            email: "chris@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Clare Sherlock",           email: "clare@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Craig Jones",              email: "craig@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Dale Gosling",             email: "dale@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Dan Quick",                email: "dan@qrltd.co.uk",              currency: "GBP", office: "UK" },
  { name: "Danny Lee",                email: "danny@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Darryl Rampton",           email: "darryl@qrltd.co.uk",           currency: "GBP", office: "UK" },
  { name: "David Linscott",           email: "david@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Debbie Keen",              email: "admin@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Diana Freire",             email: "diana@qr-inc.com",             currency: "USD", office: "USA" },
  { name: "Dinah Moshome",            email: "dinah@qrltd.co.za",            currency: "ZAR", office: "ZA" },
  { name: "Ed Gibbons",               email: "ed@qrltd.co.uk",               currency: "GBP", office: "UK" },
  { name: "Edward Everson",           email: "edward@qrltd.co.uk",           currency: "GBP", office: "UK" },
  { name: "Elena Gallego",            email: "elena@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Ewa Christiane Gackenholz",email: "ewa@qrgmbh.eu",               currency: "EUR", office: "GERMANY" },
  { name: "Gavin Ardley",             email: "gavin@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Hanna Poll",               email: "hanna@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Hazel Linscott",           email: "hazel@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Ian Stafford",             email: "ian@qrltd.co.uk",              currency: "GBP", office: "UK" },
  { name: "Isaac Mokoena",            email: "isaac@qrltd.co.za",            currency: "ZAR", office: "ZA" },
  { name: "Jake Slimm",               email: "jake@qr-inc.com",              currency: "USD", office: "USA" },
  { name: "Jennifer Rhoades",         email: "Jennifer@qr-inc.com",          currency: "USD", office: "USA" },
  { name: "Jeongeon Kim",             email: "JKim@qr-llc.com",              currency: "USD", office: "USA" },
  { name: "Jim Corr",                 email: "Jim@qr-inc.com",               currency: "USD", office: "USA" },
  { name: "Joe Vesci",                email: "joe@qr-inc.com",               currency: "USD", office: "USA" },
  { name: "John Lavergata",           email: "john@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Jordan White",             email: "jordan@qrltd.co.uk",           currency: "GBP", office: "UK" },
  { name: "Julian Herzog",            email: "julian@qrgmbh.eu",             currency: "EUR", office: "GERMANY" },
  { name: "Kathy Cauley",             email: "kathy@qr-inc.com",             currency: "USD", office: "USA" },
  { name: "Kay Suchaya",              email: "admin@qrltd.com.au",           currency: "AUD", office: "AU" },
  { name: "Kevin Yearsley",           email: "kevin@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Kimberly Eden",            email: "kimberley@qrltd.co.uk",        currency: "GBP", office: "UK" },
  { name: "Kristin Will",             email: "kristin@qrgmbh.eu",            currency: "EUR", office: "GERMANY" },
  { name: "Laura Anastasi",           email: "laura@qr-inc.com",             currency: "USD", office: "USA" },
  { name: "Laura Thoroughgood",       email: "laura@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Lee Collar",               email: "lee@qrltd.co.uk",              currency: "GBP", office: "UK" },
  { name: "Lina Smith",               email: "lina@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Louise Weyermans-Noble",   email: "louise@qrltd.co.za",           currency: "ZAR", office: "ZA" },
  { name: "Lucy Spiteri",             email: "lucy@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Marc Mann",                email: "marc@qr-inc.com",              currency: "USD", office: "USA" },
  { name: "Martin Husfeldt",          email: "martin@qrgmbh.eu",             currency: "EUR", office: "GERMANY" },
  { name: "Martina Hallmann",         email: "martina@qrgmbh.eu",            currency: "EUR", office: "GERMANY" },
  { name: "Matt Linscott",            email: "MattL@qrltd.co.uk",            currency: "GBP", office: "UK" },
  { name: "Mauricio Ruiz",            email: "Mauricio.Ruiz@qr-inc.com",     currency: "USD", office: "USA" },
  { name: "Michael Ruestmann",        email: "michael@qrgmbh.eu",            currency: "EUR", office: "GERMANY" },
  { name: "Michael Schofield",        email: "michael@qrltd.co.uk",          currency: "GBP", office: "UK" },
  { name: "Mikaela Carzo",            email: "qrexpediting@qr-inc.com",      currency: "USD", office: "USA" },
  { name: "Mike Cauley",              email: "mike@qr-inc.com",              currency: "USD", office: "USA" },
  { name: "Mike Schraepfer",          email: "michael@qr-inc.com",           currency: "USD", office: "USA" },
  { name: "Mike Vieyra",              email: "mike@qrltd.co.za",             currency: "ZAR", office: "ZA" },
  { name: "Neil Mitchell",            email: "shipping@qrltd.co.uk",         currency: "GBP", office: "UK" },
  { name: "Nicolas Samtoy",           email: "nic@qrltd.com.au",             currency: "AUD", office: "AU" },
  { name: "Nina Elliott",             email: "nina@qrltd.co.uk",             currency: "GBP", office: "UK" },
  { name: "Nina Melzen",              email: "nina@qrgmbh.eu",               currency: "EUR", office: "GERMANY" },
  { name: "Olivia Hussey",            email: "olivia@qrltd.co.uk",           currency: "GBP", office: "UK" },
  { name: "Pete O'Donnell",           email: "pete@qr-inc.com",              currency: "USD", office: "USA" },
  { name: "Rebecca Turtle",           email: "rebecca@qrltd.co.uk",          currency: "GBP", office: "UK" },
  { name: "Richard Harris",           email: "richard@qrltd.co.uk",          currency: "GBP", office: "UK" },
  { name: "Rob Austin",               email: "rob@qrltd.co.uk",              currency: "GBP", office: "UK" },
  { name: "Ryan Murphy",              email: "ryan@qr-inc.com",              currency: "USD", office: "USA" },
  { name: "Sagar Dansinghani",        email: "sagar@qrltd.co.uk",            currency: "GBP", office: "UK" },
];

const ROLE_OPTIONS = [
  { value: "user",  label: "User",  desc: "Create quotes, view history" },
  { value: "admin", label: "Admin", desc: "Full access including settings and users" },
];

const OFFICE_OPTIONS = ["UK", "USA", "GERMANY", "ZA", "AU"];
const CURRENCY_OPTIONS = ["GBP", "USD", "EUR", "ZAR", "AUD", "SGD", "SAR", "QAR"];

export default function Users() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [seeding, setSeeding]   = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", role: "user",
    office: "UK", currency: "GBP", active: true
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", email: "", role: "user", office: "UK", currency: "GBP", active: true });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(u) {
    setForm({
      name: u.name || "", email: u.email || "",
      role: u.role || "user", office: u.office || "UK",
      currency: u.currency || "GBP", active: u.active !== false
    });
    setEditId(u.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) { alert("Name and email required"); return; }
    setSaving(true);
    const data = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      office: form.office,
      currency: form.currency,
      active: form.active,
    };
    if (editId) {
      await updateDoc(doc(db, "users", editId), data);
    } else {
      await setDoc(doc(db, "users", form.email.trim().toLowerCase()), {
        ...data, createdAt: serverTimestamp()
      });
    }
    setSaving(false);
    resetForm();
    load();
  }

  async function toggleActive(u) {
    await updateDoc(doc(db, "users", u.id), { active: !u.active });
    load();
  }

  async function remove(u) {
    if (!confirm(`Remove ${u.name}? This cannot be undone.`)) return;
    await deleteDoc(doc(db, "users", u.id));
    load();
  }

  async function seedUsers() {
    if (!confirm(`This will add ${SEED_USERS.length} users from the Excel spreadsheet to Firestore. Existing users with the same email will be updated. Continue?`)) return;
    setSeeding(true);
    let count = 0;
    for (const u of SEED_USERS) {
      await setDoc(doc(db, "users", u.email.toLowerCase()), {
        name: u.name, email: u.email.toLowerCase(),
        role: "user", office: u.office || "UK",
        currency: u.currency || "GBP", active: true,
        createdAt: serverTimestamp(),
      }, { merge: true });
      count++;
    }
    setSeeding(false);
    alert(`${count} users imported successfully.`);
    load();
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.office?.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === "admin").length;
  const activeCount = users.filter(u => u.active !== false).length;

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {users.length} users · {activeCount} active · {adminCount} admin{adminCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={seedUsers}
              disabled={seeding}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
            >
              {seeding ? "Importing…" : "Import from Excel"}
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-[#C4006A] hover:bg-[#a3005a] rounded-lg text-sm font-semibold"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold mb-4">{editId ? "Edit User" : "Add User"}</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Field label="Full name" value={form.name} onChange={v => setForm(p => ({...p, name: v}))} />
              <Field label="Email address" value={form.email} onChange={v => setForm(p => ({...p, email: v}))} type="email" />
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Role</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Office</label>
                <select value={form.office} onChange={e => setForm(p => ({...p, office: e.target.value}))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                  {OFFICE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Default currency</label>
                <select value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                  {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active}
                    onChange={e => setForm(p => ({...p, active: e.target.checked}))}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm text-slate-300">Active account</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
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

        {/* Search */}
        <input
          className="w-full px-4 py-2.5 mb-4 bg-slate-900 border border-slate-700 rounded-lg text-sm placeholder-slate-500"
          placeholder="Search by name, email or office…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Table */}
        {loading ? (
          <div className="text-slate-400 py-12 text-center">Loading users…</div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Office</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Currency</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${u.active === false ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">{u.office || "UK"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-slate-800 rounded font-mono">{u.currency || "GBP"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.role === "admin"
                          ? "bg-[#C4006A]/20 text-[#f472b6] border border-[#C4006A]/30"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {u.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        u.active !== false
                          ? "bg-green-900/40 text-green-400 border border-green-800"
                          : "bg-slate-800 text-slate-500"
                      }`}>
                        {u.active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => startEdit(u)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">Edit</button>
                        <button onClick={() => toggleActive(u)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                          {u.active !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => remove(u)}
                          className="px-3 py-1 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded text-xs">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-slate-400 text-center py-12">No users found. Use "Import from Excel" to seed users.</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm" />
    </div>
  );
}
