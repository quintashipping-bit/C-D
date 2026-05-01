import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

export default function EditQuote() {
  const { id } = useParams();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, []);

  async function loadQuote() {
    const ref = doc(db, "quotes", id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setQuote({
        id: snap.id,
        ...snap.data()
      });
    }

    setLoading(false);
  }

  function updateField(name, value) {
    setQuote({
      ...quote,
      [name]: value
    });
  }

  function recalculate() {
    const value = Number(quote.value || 0);

    let dutyRate = 0;

    if (
      quote.country === "Saudi Arabia" ||
      quote.country === "Qatar" ||
      quote.country === "Australia"
    ) {
      dutyRate = 0.05;
    }

    const duty = value * dutyRate;
    const total =
      duty +
      Number(quote.clearance || 0) +
      Number(quote.delivery || 0);

    setQuote({
      ...quote,
      duty,
      total
    });
  }

  async function saveQuote() {
    const ref = doc(db, "quotes", id);

    await updateDoc(ref, {
      ...quote
    });

    alert("Quote Updated");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-10">
        Loading...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-10">
        Quote not found.
      </div>
    );
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-6">
          Edit Quote
        </h1>

        <div className="bg-zinc-900 p-6 rounded-2xl space-y-4">

          <div className="text-zinc-400">
            {quote.customerName} / {quote.country}
          </div>

          <input
            className="w-full p-3 rounded bg-zinc-800"
            value={quote.value || ""}
            onChange={e =>
              updateField("value", e.target.value)
            }
            placeholder="Goods Value"
          />

          <input
            className="w-full p-3 rounded bg-zinc-800"
            value={quote.clearance || ""}
            onChange={e =>
              updateField("clearance", e.target.value)
            }
            placeholder="Clearance"
          />

          <input
            className="w-full p-3 rounded bg-zinc-800"
            value={quote.delivery || ""}
            onChange={e =>
              updateField("delivery", e.target.value)
            }
            placeholder="Delivery"
          />

          <select
            className="w-full p-3 rounded bg-zinc-800"
            value={quote.status || "draft"}
            onChange={e =>
              updateField("status", e.target.value)
            }
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
          </select>

          <button
            onClick={recalculate}
            className="w-full bg-fuchsia-700 p-3 rounded-xl"
          >
            Recalculate
          </button>

          <div className="text-2xl font-bold text-fuchsia-400">
            {quote.currency} {Number(quote.total || 0).toFixed(2)}
          </div>

          <button
            onClick={saveQuote}
            className="w-full bg-green-700 p-3 rounded-xl"
          >
            Save Changes
          </button>

        </div>
      </div>
    </div>
  );
}
