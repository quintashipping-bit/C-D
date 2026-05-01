import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Sidebar() {
  const location = useLocation();

  const item = (to, label) => {
    const active = location.pathname === to;

    return (
      <Link
        to={to}
        className={`block px-4 py-3 rounded-xl mb-2 transition ${
          active
            ? "bg-fuchsia-700 text-white"
            : "text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="w-64 bg-zinc-900 min-h-screen p-6 border-r border-zinc-800">
      <h1 className="text-2xl font-bold text-fuchsia-500 mb-8">
        Quinta Addison
      </h1>

      {item("/", "Dashboard")}
      {item("/quotes", "Quotes")}
      {item("/customers", "Customers")}
      {item("/users", "Users")}
      {item("/settings", "Settings")}

      <button
        onClick={() => signOut(auth)}
        className="mt-8 w-full bg-zinc-800 hover:bg-zinc-700 px-4 py-3 rounded-xl"
      >
        Logout
      </button>
    </div>
  );
}
