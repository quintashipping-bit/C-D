import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Quotes from "../pages/Quotes";
import QuoteHistory from "../pages/QuoteHistory";
import Settings from "../pages/Settings";

function Placeholder({ title }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-3xl font-bold text-fuchsia-500 mb-4">
        {title}
      </h1>

      <p className="text-zinc-400">
        This section is being built.
      </p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* DASHBOARD */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* QUOTES */}
      <Route
        path="/quotes"
        element={
          <ProtectedRoute>
            <Quotes />
          </ProtectedRoute>
        }
      />

      {/* HISTORY */}
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <QuoteHistory />
          </ProtectedRoute>
        }
      />

      {/* CUSTOMERS */}
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Placeholder title="Customers" />
          </ProtectedRoute>
        }
      />

      {/* USERS */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Placeholder title="Users" />
          </ProtectedRoute>
        }
      />

      {/* SETTINGS */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to="/" />}
      />

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
