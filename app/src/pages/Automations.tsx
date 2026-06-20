import * as React from "react";
import { Zap, GitBranch, UserSearch, AlertTriangle, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody } from "../components/ui";
import { LoadingState, ErrorState } from "../components/states";
import type { Automation } from "../types/database";

const RULES: { key: string; title: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "referral_accepted_create_task", icon: GitBranch,
    title: "Referral accepted → create task",
    description: "When a referral reaches Accepted, automatically create a 'Set up service agreement & start date' task (due in 7 days)." },
  { key: "referral_commenced_add_provider", icon: Building2,
    title: "Referral commenced → add to care team",
    description: "When a referral commences, add that provider to the participant's care team automatically." },
  { key: "referral_commenced_create_task", icon: GitBranch,
    title: "Referral commenced → create task",
    description: "When a referral commences, create a 'Confirm first shift & monitor commencement' task." },
  { key: "swr_placed_create_task", icon: UserSearch,
    title: "Worker placed → onboarding task",
    description: "When a Support Match request is marked Placed, create an 'Onboard placed support worker' task." },
  { key: "participant_red_create_task", icon: AlertTriangle,
    title: "Participant flagged urgent → follow-up",
    description: "When a participant's status changes to red, create an urgent follow-up task for the assigned coordinator." },
];

export default function Automations() {
  const { currentOrg, role } = useAuth();
  const [rows, setRows] = React.useState<Automation[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("automations").select("*").eq("org_id", currentOrg.id);
    if (error) setError(error.message);
    else setRows((data as Automation[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const isOn = (key: string) => {
    const r = rows?.find((x) => x.name === key);
    return r ? r.is_active : true; // default on
  };

  async function toggle(key: string) {
    if (!currentOrg) return;
    setBusy(key);
    const existing = rows?.find((x) => x.name === key);
    const next = !isOn(key);
    if (existing) {
      await supabase.from("automations").update({ is_active: next }).eq("id", existing.id);
    } else {
      await supabase.from("automations").insert({
        org_id: currentOrg.id, name: key, is_active: next, trigger: { key }, actions: [],
      });
    }
    setBusy(null);
    await load();
  }

  const canEdit = role === "admin" || role === "team_leader";

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-accent-500" />
        <div>
          <h1 className="text-2xl font-semibold text-ink">Automations</h1>
          <p className="text-sm text-ink-500">Rules that run automatically to keep your caseload moving.</p>
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-md bg-brand-50 p-3 text-sm text-ink-500">
          Automations are managed by admins and team leaders. You can see what's active below.
        </p>
      )}

      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-line">
            {RULES.map((r) => {
              const on = isOn(r.key);
              return (
                <li key={r.key} className="flex items-start justify-between gap-4 p-5">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <r.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-ink">{r.title}</p>
                      <p className="mt-0.5 text-sm text-ink-500">{r.description}</p>
                    </div>
                  </div>
                  <button
                    role="switch" aria-checked={on} disabled={!canEdit || busy === r.key}
                    onClick={() => toggle(r.key)}
                    className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-brand-700" : "bg-line"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <p className="text-xs text-ink-500">
        Automations run in your database the moment the triggering event happens — no waiting, and they
        work even when the change comes from the Support Match console. Time-based reminders (plan reviews,
        overdue tasks, low funding) appear in the alerts bell.
      </p>
    </div>
  );
}
