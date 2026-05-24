import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";
import generateQuotePDF from "../utils/generateQuotePDF";

const STATUS_STYLES = {
  draft:    "bg-slate-700 text-slate-300",
  sent:     "bg-blue-900/50 text-blue-300 border border-blue-800",
  approved: "bg-green-900/50 text-green-300 border border-green-800",
  rejected: "bg-red-900/50 text-red-400 border border-red-800",
};

export default function QuoteHistory() {
  const [quotes, setQuotes]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { loadQuotes(); }, []);
  useEffect(() => { filter(); }, [search, statusFilter, quotes]);

  async function loadQuotes() {
    const snap = await getDocs(query(collection(db, "quotes"), orderBy("createdAt", "desc")));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setQuotes(data);
    setFiltered(data);
  }

  function filter() {
    let results = quotes;
    if (statusFilter !== "all") results = results.filter(q => (q.status || "draft") === statusFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      results = results.filter(q =>
        q.customerName?.toLowerCase().includes(t) ||
        q.country?.toLowerCase().includes(t) ||
        String(q.quoteNumber || "").includes(t)
      );
    }
    setFiltered(results);
  }

  const sym = { GBP: "£", USD: "$", EUR: "€", AUD: "A$", ZAR: "R", SGD: "S$", SAR: "SR", QAR: "QR" };

  return (
    <div className="flex bg-slate-950 text-white min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Quote History</h1>
            <p className="text-slate-400 text-sm mt-0.5">{filtered.length} of {quotes.length} quotes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <input
            className="flex-1 max-w-xs"
            placeholder="Search customer, country or ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-36">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Ref</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Country</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Transport</th>
                <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[#C4006A] font-semibold text-xs">
                      QR-{String(item.quoteNumber || "—").padStart(5, "0")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.customerName}</td>
                  <td className="px-4 py-3 text-slate-400">{item.country}</td>
                  <td className="px-4 py-3 text-slate-400">{item.transport || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {sym[item.currency] || ""}{Number(item.total || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-slate-500 text-xs ml-1">{item.currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.draft}`}>
                      {item.status || "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {item.createdAt?.seconds
                      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Link to={`/history/${item.id}`}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium">
                        Open
                      </Link>
                      <button
                        onClick={() => generateQuotePDF(item)}
                        className="px-3 py-1 bg-[#C4006A]/20 hover:bg-[#C4006A]/40 text-[#f472b6] rounded text-xs font-medium border border-[#C4006A]/30">
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-slate-400 text-center py-12 text-sm">No quotes found.</div>
          )}
        </div>

      </div>
    </div>
  );
}
