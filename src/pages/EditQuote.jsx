import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";
import generateQuotePDF from "../utils/generateQuotePDF";

export default function EditQuote() {
  const { id } = useParams();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuote();
  }, []);

  async function loadQuote() {
    try {
      const ref = doc(db, "quotes", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setQuote({
          id: snap.id,
          ...snap.data()
        });
      }
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  }

  function updateField(name, value) {
    setQuote(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function recalculate() {
    if (!quote) return;

    const goodsValue = Number(quote.value || 0);
    const clearance = Number(quote.clearance || 0);
    const delivery = Number(quote.delivery || 0);

    let dutyRate = 0;

    if (
      quote.country === "Saudi Arabia" ||
      quote.country === "Qatar" ||
      quote.country === "Australia"
    ) {
      dutyRate = 0.05;
    }

    const duty = goodsValue * dutyRate;
    const total = duty + clearance + delivery;

    setQuote(prev => ({
      ...prev,
      duty,
      total
    }));
  }

  async function saveQuote() {
    if (!quote) return;

    setSaving(true);

    try {
      const ref = doc(db, "quotes", id);

      await updateDoc(ref, {
        value: Number(quote.value || 0),
        clearance: Number(quote.clearance || 0),
        delivery: Number(quote.delivery || 0),
        duty: Number(quote.duty || 0),
        total: Number(quote.total || 0),
        status: quote.status || "draft"
      });

      alert("Quote Updated");
    } catch (error) {
      console.error(error);
      alert("Unable to save quote");
    }

    setSaving(false);
  }

  function downloadPDF() {
    if (!quote) return;
    generateQuotePDF(quote);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Loading Quote...
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Quote not found.
      </div>
    );
  }

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">

          <h1 className="text-3xl font-bold text-fuchsia-500 mb-2">
            Edit Quote
          </h1>

          <p className="text-zinc-400 mb-8">
            {quote.customerName} / {quote.country}
          </p>

          <div className="bg-zinc-900 rounded-2xl p-6 space-y-5">

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Goods Value"
              value={quote.value || ""}
              onChange={e =>
                updateField("value", e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Clearance"
              value={quote.clearance || ""}
              onChange={e =>
                updateField("clearance", e.target.value)
              }
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-800"
              placeholder="Delivery"
              value={quote.delivery || ""}
              onChange={e =>
                updateField("delivery", e.target.value)
              }
            />

            <select
              className="w-full p-3 rounded-xl bg-zinc-800"
              value={quote.status || "draft"}
              onChange={e =>
                updateField("status", e.target.value)
              }
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="grid md:grid-cols-3 gap-3">

              <button
                onClick={recalculate}
                className="bg-fuchsia-700 hover:bg-fuchsia-800 p-3 rounded-xl"
              >
                Recalculate
              </button>

              <button
                onClick={saveQuote}
                disabled={saving}
                className="bg-green-700 hover:bg-green-800 p-3 rounded-xl disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={downloadPDF}
                className="bg-blue-700 hover:bg-blue-800 p-3 rounded-xl"
              >
                Generate PDF
              </button>

            </div>

            <div className="border-t border-zinc-800 pt-5">

              <div className="flex justify-between py-2">
                <span>Duty</span>
                <span>
                  {Number(quote.duty || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span>Clearance</span>
                <span>
                  {Number(quote.clearance || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span>Delivery</span>
                <span>
                  {Number(quote.delivery || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between pt-4 text-3xl font-bold text-fuchsia-400">
                <span>Total</span>
                <span>
                  {quote.currency}{" "}
                  {Number(quote.total || 0).toFixed(2)}
                </span>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
