import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const [customers, setCustomers] = useState(0);
  const [quotes, setQuotes] = useState(0);
  const [users, setUsers] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const c = await getDocs(collection(db, "customers"));
    const q = await getDocs(collection(db, "quotes"));
    const u = await getDocs(collection(db, "users"));

    setCustomers(c.size);
    setQuotes(q.size);
    setUsers(u.size);
  }

  const Card = ({ title, value }) => (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <p className="text-zinc-400 text-sm">{title}</p>
      <h2 className="text-4xl font-bold mt-2 text-white">{value}</h2>
    </div>
  );

  return (
    <div className="flex bg-zinc-950 text-white min-h-screen">
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-fuchsia-500 mb-8">
          Dashboard
        </h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card title="Customers" value={customers} />
          <Card title="Quotes" value={quotes} />
          <Card title="Users" value={users} />
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

          <div className="text-zinc-400">
            System ready. Firebase connected.
          </div>
        </div>
      </div>
    </div>
  );
}
