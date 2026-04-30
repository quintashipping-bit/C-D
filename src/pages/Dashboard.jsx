import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [customers, setCustomers] = useState(0);
  const [quotes, setQuotes] = useState(0);
  const [users, setUsers] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const custSnap = await getDocs(collection(db, "customers"));
    const quoteSnap = await getDocs(collection(db, "quotes"));
    const userSnap = await getDocs(collection(db, "users"));

    setCustomers(custSnap.size);
    setQuotes(quoteSnap.size);
    setUsers(userSnap.size);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-fuchsia-500">
          C & D Dashboard
        </h1>

        <button
          onClick={logout}
          className="bg-zinc-800 px-4 py-2 rounded-xl"
        >
          Logout
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">Customers</p>
          <h2 className="text-4xl font-bold">{customers}</h2>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">Quotes</p>
          <h2 className="text-4xl font-bold">{quotes}</h2>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">Users</p>
          <h2 className="text-4xl font-bold">{users}</h2>
        </div>

      </div>
    </div>
  );
}
