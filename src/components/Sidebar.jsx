import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  async function logout() {
    await signOut(auth);
  }

  const navItem = (to, label) => {
    const active = location.pathname === to || (to !== "/quotes" && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          active
            ? "bg-[#C4006A]/20 text-[#C4006A] border border-[#C4006A]/30"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="w-56 bg-slate-900 min-h-screen flex flex-col border-r border-slate-800">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="QR Logo" className="w-10 h-10 object-contain" />
          <div>
            <div className="text-white font-bold text-sm leading-tight">Quinta Raddison</div>
            <div className="text-slate-500 text-xs">C&D Calculator</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItem("/quotes", "New Quote")}
        {navItem("/history", "Quote History")}
        {navItem("/customers", "Customers")}
        {isAdmin && navItem("/users", "Users")}
        {isAdmin && navItem("/settings", "Settings")}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        {profile && (
          <div className="px-4 py-2 mb-2">
            <div className="text-white text-xs font-semibold truncate">{profile.name}</div>
            <div className="text-slate-500 text-xs capitalize">{profile.role || "user"}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          Sign out
        </button>
      </div>

    </div>
  );
}
