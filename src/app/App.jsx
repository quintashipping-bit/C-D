import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

import Login          from "../pages/Login";
import Quotes         from "../pages/Quotes";
import QuoteHistory   from "../pages/QuoteHistory";
import EditQuote      from "../pages/EditQuote";
import Customers      from "../pages/Customers";
import Users          from "../pages/Users";
import Settings       from "../pages/Settings";

import AustraliaSettings   from "../pages/settings/AustraliaSettings";
import SouthAfricaSettings from "../pages/settings/SouthAfricaSettings";
import QatarSettings       from "../pages/settings/QatarSettings";
import SaudiSettings       from "../pages/settings/SaudiSettings";
import SingaporeSettings   from "../pages/settings/SingaporeSettings";
import ExchangeRates       from "../pages/settings/ExchangeRates";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-sm text-slate-400">
      Loading…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== "admin") return <Navigate to="/quotes" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"       element={<Navigate to="/quotes" replace />} />

      <Route path="/quotes"          element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
      <Route path="/history"         element={<ProtectedRoute><QuoteHistory /></ProtectedRoute>} />
      <Route path="/history/:id"     element={<ProtectedRoute><EditQuote /></ProtectedRoute>} />
      <Route path="/customers"       element={<ProtectedRoute><Customers /></ProtectedRoute>} />

      <Route path="/users"           element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
      <Route path="/settings"        element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
      <Route path="/settings/australia"     element={<ProtectedRoute adminOnly><AustraliaSettings /></ProtectedRoute>} />
      <Route path="/settings/south-africa"  element={<ProtectedRoute adminOnly><SouthAfricaSettings /></ProtectedRoute>} />
      <Route path="/settings/qatar"         element={<ProtectedRoute adminOnly><QatarSettings /></ProtectedRoute>} />
      <Route path="/settings/saudi"         element={<ProtectedRoute adminOnly><SaudiSettings /></ProtectedRoute>} />
      <Route path="/settings/singapore"     element={<ProtectedRoute adminOnly><SingaporeSettings /></ProtectedRoute>} />
      <Route path="/settings/exchange-rates" element={<ProtectedRoute adminOnly><ExchangeRates /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/quotes" replace />} />
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
