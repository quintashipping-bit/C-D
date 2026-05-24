import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/quotes");
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo + branding */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Quinta Raddison" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-white text-xl font-bold">Quinta Raddison Ltd</h1>
          <p className="text-slate-400 text-sm mt-1">C&D Shipping Calculator</p>
        </div>

        <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Email address</label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#C4006A] transition"
              placeholder="you@qrltd.co.uk"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wide">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#C4006A] transition"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C4006A] hover:bg-[#a3005a] disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-all"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} Quinta Raddison Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
