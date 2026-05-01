import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Sidebar() {
  async function logout() {
    await signOut(auth);
  }

  const item =
    "block px-4 py-3 rounded-xl hover:bg-zinc-800 transition";

  return (
    <div className="w-64 bg-zinc-900 min-h-screen p-6 border-r border-zinc-800">

      <h1 className="text-2xl font-bold text-fuchsia-500 mb-8">
        C & D Admin
      </h1>

      <div className="space-y-2">

        <Link to="/" className={item}>
          Dashboard
        </Link>

        <Link to="/quotes" className={item}>
          Quotes
        </Link>

        <Link to="/history" className={item}>
          Quote History
        </Link>

        <Link to="/customers" className={item}>
          Customers
        </Link>

        <Link to="/users" className={item}>
          Users
        </Link>

        <Link to="/settings" className={item}>
          Settings
        </Link>

      </div>

      <button
        onClick={logout}
        className="mt-10 w-full bg-red-700 hover:bg-red-800 p-3 rounded-xl"
      >
        Logout
      </button>

    </div>
  );
}
