import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

/* MAIN PAGES */
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Quotes from "../pages/Quotes";
import QuoteHistory from "../pages/QuoteHistory";
import Settings from "../pages/Settings";

/* SETTINGS SUB PAGES */
import AustraliaSettings from "../pages/settings/AustraliaSettings";
import SouthAfricaSettings from "../pages/settings/SouthAfricaSettings";

/* =====================================================
   PLACEHOLDER
===================================================== */

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

/* =====================================================
   PROTECTED ROUTE
===================================================== */

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

/* =====================================================
   APP ROUTES
===================================================== */

function AppRoutes() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC
      ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          QUOTES
      ===================================================== */}

      <Route
        path="/quotes"
        element={
          <ProtectedRoute>
            <Quotes />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          HISTORY
      ===================================================== */}

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <QuoteHistory />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          CUSTOMERS
      ===================================================== */}

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Placeholder title="Customers" />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          USERS
      ===================================================== */}

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Placeholder title="Users" />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          MAIN SETTINGS PAGE
      ===================================================== */}

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          AUSTRALIA SETTINGS
      ===================================================== */}

      <Route
        path="/settings/australia"
        element={
          <ProtectedRoute>
            <AustraliaSettings />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          SOUTH AFRICA SETTINGS
      ===================================================== */}

      <Route
        path="/settings/south-africa"
        element={
          <ProtectedRoute>
            <SouthAfricaSettings />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          QATAR SETTINGS
      ===================================================== */}

      <Route
        path="/settings/qatar"
        element={
          <ProtectedRoute>
            <Placeholder title="Qatar Settings" />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          SAUDI SETTINGS
      ===================================================== */}

      <Route
        path="/settings/saudi"
        element={
          <ProtectedRoute>
            <Placeholder title="Saudi Settings" />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          SINGAPORE SETTINGS
      ===================================================== */}

      <Route
        path="/settings/singapore"
        element={
          <ProtectedRoute>
            <Placeholder title="Singapore Settings" />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EXCHANGE RATES
      ===================================================== */}

      <Route
        path="/settings/exchange-rates"
        element={
          <ProtectedRoute>
            <Placeholder title="Exchange Rates" />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          FALLBACK
      ===================================================== */}

      <Route
        path="*"
        element={<Navigate to="/" />}
      />

    </Routes>
  );
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
