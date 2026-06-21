import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import { AppLayout } from "./components/AppLayout";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { LoadingState } from "./components/states";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Participants from "./pages/Participants";
import ParticipantDetail from "./pages/ParticipantDetail";
import ParticipantReport from "./pages/ParticipantReport";
import Tasks from "./pages/Tasks";
import Providers from "./pages/Providers";
import ProviderDetail from "./pages/ProviderDetail";
import Referrals from "./pages/Referrals";
import Funding from "./pages/Funding";
import Reports from "./pages/Reports";
import Automations from "./pages/Automations";
import Billing from "./pages/Billing";
import Feedback from "./pages/Feedback";
import AgreementDocument from "./pages/AgreementDocument";
import Settings from "./pages/Settings";
import Import from "./pages/Import";
import Claims from "./pages/Claims";
import CalendarPage from "./pages/Calendar";
import Incidents from "./pages/Incidents";
import AgreementsList from "./pages/AgreementsList";
import DocumentsLibrary from "./pages/DocumentsLibrary";
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

          {/* Standalone printable report (no app chrome) */}
          <Route path="/participants/:id/report" element={<RequireAuth><ParticipantReport /></RequireAuth>} />
          <Route path="/agreements/:id" element={<RequireAuth><AgreementDocument /></RequireAuth>} />

          {/* Coordinator app */}
          <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="participants" element={<Participants />} />
            <Route path="participants/:id" element={<ParticipantDetail />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="providers" element={<Providers />} />
            <Route path="providers/:id" element={<ProviderDetail />} />
            <Route path="funding" element={<Funding />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="billing" element={<Billing />} />
            <Route path="claims" element={<Claims />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="agreements" element={<AgreementsList />} />
            <Route path="documents" element={<DocumentsLibrary />} />
            <Route path="settings" element={<Settings />} />
            <Route path="import" element={<Import />} />
            <Route path="automations" element={<Automations />} />
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
