import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

export default function QuoteHistory() {
  const [quotes, setQuotes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    runFilter();
  }, [search, quotes]);

  async function loadQuotes() {
    const q = query(
      collection(db, "quotes"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setQuotes(data);
    setFiltered(data);
  }

  function runFilter() {
    const term = search.toLowerCase();

    const data = quotes.filter(q =>
      q.customerName?.toLowerCase().includes(term) ||
      q.country?.toLowerCase().includes(term)
    );

    setFiltered(data);
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-6">
          Quote History
        </h1>

        <input
          className="w-full mb-6 p-3 rounded bg-zinc-800"
          placeholder="Search customer or country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="bg-zinc-900 rounded-2xl overflow-hidden">

          <div className="grid grid-cols-5 gap-4 p-4 border-b border-zinc-800 text-sm text-zinc-400 font-semibold">
            <div>Customer</div>
            <div>Country</div>
            <div>Total</div>
            <div>Status</div>
            <div>Date</div>
          </div>

          {filtered.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-5 gap-4 p-4 border-b border-zinc-800 hover:bg-zinc-800"
            >
              <div>{item.customerName}</div>
              <div>{item.country}</div>
              <div>
                {item.currency} {Number(item.total).toFixed(2)}
              </div>
              <div>{item.status || "draft"}</div>
              <div>
                {item.createdAt?.seconds
                  ? new Date(
                      item.createdAt.seconds * 1000
                    ).toLocaleDateString()
                  : "-"}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-6 text-zinc-400">
              No quotes found.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
