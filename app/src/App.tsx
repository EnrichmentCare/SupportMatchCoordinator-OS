import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import { AppLayout } from "./components/AppLayout";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { LoadingState } from "./components/states";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import Leads from "./pages/admin/Leads";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <LoadingState />
    </div>
  );
}

// Requires a session; sends users with no org to onboarding.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, memberships, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (memberships.length === 0) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// For /login and /signup — bounce already-authed users into the app.
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OnboardingGuard() {
  const { session, memberships, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (memberships.length > 0) return <Navigate to="/" replace />;
  return <Onboarding />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route path="/onboarding" element={<OnboardingGuard />} />

          {/* Coordinator app */}
          <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="participants" element={<Placeholder title="Participants" phase="Phase 1" />} />
            <Route path="referrals" element={<Placeholder title="Referrals" phase="Phase 2" />} />
            <Route path="providers" element={<Placeholder title="Providers" phase="Phase 2" />} />
            <Route path="funding" element={<Placeholder title="Funding" phase="Phase 2" />} />
            <Route path="tasks" element={<Placeholder title="Tasks" phase="Phase 1" />} />
          </Route>

          {/* Separate Support Match admin surface */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Leads />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
