import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, GitBranch, Building2, Wallet, CheckSquare,
  Heart, LogOut, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import { cn, initials } from "../lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; soon?: boolean };
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/participants", label: "Participants", icon: Users },
  { to: "/referrals", label: "Referrals", icon: GitBranch },
  { to: "/providers", label: "Providers", icon: Building2 },
  { to: "/funding", label: "Funding", icon: Wallet },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
];

export function AppLayout() {
  const { profile, currentOrg, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
            <Heart className="h-4 w-4" />
          </div>
          <span className="font-semibold text-ink">Coordinator OS</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-100 text-brand-700" : "text-ink-500 hover:bg-brand-50 hover:text-ink"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
                  Soon
                </span>
              )}
            </NavLink>
          ))}
          {profile?.is_support_match_admin && (
            <NavLink
              to="/admin"
              className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-accent-600 hover:bg-accent-100"
            >
              <ShieldCheck className="h-4 w-4" />
              Support Match admin
            </NavLink>
          )}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
          <div className="text-sm text-ink-500">
            {currentOrg?.name}
            {role && <span className="ml-2 capitalize text-ink-500/70">· {role.replaceAll("_", " ")}</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(profile?.full_name)}
            </div>
            <button
              onClick={async () => { await signOut(); navigate("/login"); }}
              className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
