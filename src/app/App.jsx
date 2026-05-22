import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

import Login          from "../pages/Login";
import Dashboard      from "../pages/Dashboard";
import Quotes         from "../pages/Quotes";
import QuoteHistory   from "../pages/QuoteHistory";
import EditQuote      from "../pages/EditQuote";
import Customers      from "../pages/Customers";
import Settings       from "../pages/Settings";

import AustraliaSettings  from "../pages/settings/AustraliaSettings";
import SouthAfricaSettings from "../pages/settings/SouthAfricaSettings";
import QatarSettings      from "../pages/settings/QatarSettings";
import SaudiSettings      from "../pages/settings/SaudiSettings";
import SingaporeSettings  from "../pages/settings/SingaporeSettings";
import ExchangeRates      from "../pages/settings/ExchangeRates";

function Users() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold text-fuchsia-500 mb-4">Users</h1>
      <p className="text-zinc-400">User management coming soon.</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      Loading...
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><QuoteHistory /></ProtectedRoute>} />
      <Route path="/history/:id" element={<ProtectedRoute><EditQuote /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />

      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/australia"    element={<ProtectedRoute><AustraliaSettings /></ProtectedRoute>} />
      <Route path="/settings/south-africa" element={<ProtectedRoute><SouthAfricaSettings /></ProtectedRoute>} />
      <Route path="/settings/qatar"        element={<ProtectedRoute><QatarSettings /></ProtectedRoute>} />
      <Route path="/settings/saudi"        element={<ProtectedRoute><SaudiSettings /></ProtectedRoute>} />
      <Route path="/settings/singapore"    element={<ProtectedRoute><SingaporeSettings /></ProtectedRoute>} />
      <Route path="/settings/exchange-rates" element={<ProtectedRoute><ExchangeRates /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
