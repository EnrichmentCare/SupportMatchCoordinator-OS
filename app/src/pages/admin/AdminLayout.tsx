import { Outlet, useNavigate, Navigate } from "react-router-dom";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthProvider";
import { LoadingState } from "../../components/states";

// Deliberately separate surface from the coordinator app. No participant nav,
// no clinical data — only curated Support Match leads.
export function AdminLayout() {
  const { profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return <LoadingState label="Loading…" />;
  if (!profile?.is_support_match_admin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent-400" />
          <span className="font-semibold">Support Match — Lead Console</span>
        </div>
        <button
          onClick={async () => { await signOut(); navigate("/login"); }}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
