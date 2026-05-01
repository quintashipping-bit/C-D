import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";

function Placeholder({ title }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      {title} page coming next...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/quotes" element={<ProtectedRoute><Placeholder title="Quotes" /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Placeholder title="Customers" /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Placeholder title="Users" /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Placeholder title="Settings" /></ProtectedRoute>} />
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
