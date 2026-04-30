import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
  console.log(error);
  setError(error.message);
}
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 shadow-xl space-y-5 border border-zinc-800"
      >
        <h1 className="text-3xl font-bold text-center text-fuchsia-500">
          Quinta Addison
        </h1>

        <p className="text-center text-zinc-400 text-sm">
          C & D Calculator Login
        </p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded-xl bg-zinc-800 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-xl bg-zinc-800 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button className="w-full bg-fuchsia-700 hover:bg-fuchsia-600 transition p-3 rounded-xl font-semibold">
          Login
        </button>
      </form>
    </div>
  );
}
