import { Routes, Route, Navigate } from "react-router";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import Players from "./pages/Players";
import Training from "./pages/Training";
import Matches from "./pages/Matches";
import Medical from "./pages/Medical";
import Injuries from "./pages/Injuries";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCustomAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0d0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#96f7b9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Teams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/players"
        element={
          <ProtectedRoute>
            <Players />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <Training />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <Matches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical"
        element={
          <ProtectedRoute>
            <Medical />
          </ProtectedRoute>
        }
      />
      <Route
        path="/injuries"
        element={
          <ProtectedRoute>
            <Injuries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
