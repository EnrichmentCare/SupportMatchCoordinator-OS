import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckSquare, CalendarClock, Wallet, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { fmtDate, daysUntil } from "../lib/labels";

type Alert = {
  id: string;
  kind: "task" | "review" | "funding" | "urgent";
  text: string;
  sub: string;
  participantId?: string;
  to: string;
};

const ICON = {
  task: CheckSquare, review: CalendarClock, funding: Wallet, urgent: AlertTriangle,
};

export function AlertsBell() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [tasks, plans, funds, urgent] = await Promise.all([
      supabase.from("tasks").select("id,title,participant_id,due_date,status")
        .eq("org_id", currentOrg.id).lt("due_date", today)
        .in("status", ["open", "in_progress", "blocked"]),
      supabase.from("plans").select("id,participant_id,reassessment_due,end_date,is_current,participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id).eq("is_current", true).not("reassessment_due", "is", null).lte("reassessment_due", in30),
      supabase.from("funding_categories").select("id,participant_id,allocated,used,alert_threshold,name,participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id),
      supabase.from("participants").select("id,first_name,last_name,preferred_name,rag_reason")
        .eq("org_id", currentOrg.id).eq("rag_status", "red"),
    ]);

    const out: Alert[] = [];
    type PRef = { first_name: string; last_name: string; preferred_name: string | null } | null;
    const pn = (p: PRef) => (p ? `${p.preferred_name || p.first_name} ${p.last_name}` : "Participant");

    for (const t of (tasks.data as { id: string; title: string; participant_id: string | null; due_date: string }[]) ?? [])
      out.push({ id: "t" + t.id, kind: "task", text: t.title, sub: `Overdue — due ${fmtDate(t.due_date)}`,
        participantId: t.participant_id ?? undefined, to: t.participant_id ? `/participants/${t.participant_id}` : "/tasks" });

    for (const p of (plans.data as unknown as { participant_id: string; reassessment_due: string; participants: PRef }[]) ?? []) {
      const d = daysUntil(p.reassessment_due) ?? 0;
      out.push({ id: "r" + p.participant_id, kind: "review", text: `${pn(p.participants)} — plan review`,
        sub: d < 0 ? `Overdue ${Math.abs(d)}d` : `Due in ${d}d (${fmtDate(p.reassessment_due)})`, to: `/participants/${p.participant_id}` });
    }

    const lowByP = new Map<string, { name: string }>();
    for (const f of (funds.data as unknown as { participant_id: string; allocated: number; used: number; alert_threshold: number | null; participants: PRef }[]) ?? []) {
      const pct = f.allocated > 0 ? (f.used / f.allocated) * 100 : 0;
      if (f.alert_threshold != null && pct >= f.alert_threshold) lowByP.set(f.participant_id, { name: pn(f.participants) });
    }
    for (const [pid, v] of lowByP) out.push({ id: "f" + pid, kind: "funding", text: `${v.name} — low funding`, sub: "Budget threshold reached", to: `/participants/${pid}` });

    for (const u of (urgent.data as { id: string; first_name: string; last_name: string; preferred_name: string | null; rag_reason: string | null }[]) ?? [])
      out.push({ id: "u" + u.id, kind: "urgent", text: `${pn(u)} — urgent`, sub: u.rag_reason || "Marked red", to: `/participants/${u.id}` });

    setAlerts(out);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-md p-1.5 text-ink-500 hover:bg-brand-50 hover:text-ink" aria-label="Alerts">
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
            <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">Needs attention</div>
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-500">All clear 🎉</div>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                {alerts.map((a) => {
                  const Icon = ICON[a.kind];
                  return (
                    <li key={a.id}>
                      <button onClick={() => { setOpen(false); navigate(a.to); }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-brand-50/50">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{a.text}</p>
                          <p className="text-xs text-ink-500">{a.sub}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
