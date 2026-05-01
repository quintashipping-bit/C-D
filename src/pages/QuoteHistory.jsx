import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    filterQuotes();
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

  function filterQuotes() {
    const term = search.toLowerCase();

    const results = quotes.filter(item =>
      item.customerName?.toLowerCase().includes(term) ||
      item.country?.toLowerCase().includes(term)
    );

    setFiltered(results);
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-3xl font-bold text-fuchsia-500 mb-6">
          Quote History
        </h1>

        <input
          className="w-full p-3 mb-6 rounded-xl bg-zinc-800"
          placeholder="Search customer or country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="space-y-4">

          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-zinc-900 rounded-2xl p-5"
            >
              <div className="grid md:grid-cols-5 gap-4 mb-4">

                <div>
                  <div className="text-zinc-400 text-sm">
                    Customer
                  </div>
                  <div>{item.customerName}</div>
                </div>

                <div>
                  <div className="text-zinc-400 text-sm">
                    Country
                  </div>
                  <div>{item.country}</div>
                </div>

                <div>
                  <div className="text-zinc-400 text-sm">
                    Total
                  </div>
                  <div>
                    {item.currency}{" "}
                    {Number(item.total || 0).toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="text-zinc-400 text-sm">
                    Status
                  </div>
                  <div>{item.status || "draft"}</div>
                </div>

                <div>
                  <div className="text-zinc-400 text-sm">
                    Date
                  </div>
                  <div>
                    {item.createdAt?.seconds
                      ? new Date(
                          item.createdAt.seconds * 1000
                        ).toLocaleDateString()
                      : "-"}
                  </div>
                </div>

              </div>

              <div className="flex gap-3">

                <Link
                  to={`/history/${item.id}`}
                  className="bg-fuchsia-700 px-4 py-2 rounded-xl"
                >
                  Open / Edit
                </Link>

              </div>

            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-zinc-400">
              No quotes found.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
