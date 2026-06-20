import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Select, Textarea } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { GOAL_STATUS_LABEL, GOAL_STATUS_TONE, fmtDate } from "../../lib/labels";
import { Target, Plus } from "lucide-react";
import type { Goal, GoalStatus } from "../../types/database";

const STATUSES: GoalStatus[] = ["not_started", "in_progress", "achieved", "on_hold", "discontinued"];

export function GoalsPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<Goal[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({ title: "", description: "", status: "not_started" as GoalStatus, progress_pct: 0, target_date: "", evidence: "" });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("goals").select("*")
      .eq("participant_id", participantId).order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setRows((data as Goal[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("goals").insert({
      org_id: currentOrg.id, participant_id: participantId, title: f.title.trim(),
      description: f.description || null, status: f.status, progress_pct: f.progress_pct,
      target_date: f.target_date || null, evidence: f.evidence || null, created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ title: "", description: "", status: "not_started", progress_pct: 0, target_date: "", evidence: "" });
    setAdding(false); await load(); onActivity();
  }

  async function update(g: Goal, patch: Partial<Goal>) {
    const { error } = await supabase.from("goals").update(patch).eq("id", g.id);
    if (!error) { await load(); onActivity(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">NDIS goals and progress.</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add goal</Button>
      </div>

      {loading ? <LoadingState label="Loading goals…" /> : error ? <ErrorState message={error} onRetry={load} />
        : !rows || rows.length === 0 ? (
          <EmptyState icon={Target} title="No goals yet"
            description="Capture the participant's NDIS goals, track progress and record evidence."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add goal</Button>} />
        ) : (
          <ul className="space-y-3">
            {rows.map((g) => (
              <li key={g.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-ink">{g.title}</p>
                    {g.description && <p className="mt-0.5 text-sm text-ink-500">{g.description}</p>}
                  </div>
                  <Badge tone={GOAL_STATUS_TONE[g.status]}>{GOAL_STATUS_LABEL[g.status]}</Badge>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-50">
                  <div className="h-full bg-brand-500" style={{ width: `${g.progress_pct}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  <span>{g.progress_pct}% complete</span>
                  {g.target_date && <span>· Target {fmtDate(g.target_date)}</span>}
                  <span className="ml-auto flex items-center gap-2">
                    <Select className="h-8 w-36 text-xs" value={g.status}
                      onChange={(e) => update(g, { status: e.target.value as GoalStatus })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{GOAL_STATUS_LABEL[s]}</option>)}
                    </Select>
                    <input type="range" min={0} max={100} step={5} value={g.progress_pct}
                      onChange={(e) => update(g, { progress_pct: Number(e.target.value) })}
                      className="w-28 accent-brand-700" />
                  </span>
                </div>
                {g.evidence && <p className="mt-2 text-xs text-ink-500"><span className="font-medium">Evidence:</span> {g.evidence}</p>}
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add goal" size="lg">
        <form onSubmit={add} className="space-y-4">
          <Field label="Goal" htmlFor="gt"><Input id="gt" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Build independence with daily living" /></Field>
          <Field label="Description" htmlFor="gd"><Textarea id="gd" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Status" htmlFor="gs">
              <Select id="gs" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as GoalStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{GOAL_STATUS_LABEL[s]}</option>)}
              </Select>
            </Field>
            <Field label="Progress %" htmlFor="gp"><Input id="gp" type="number" min={0} max={100} value={f.progress_pct} onChange={(e) => setF({ ...f, progress_pct: Number(e.target.value) })} /></Field>
            <Field label="Target date" htmlFor="gtd"><Input id="gtd" type="date" value={f.target_date} onChange={(e) => setF({ ...f, target_date: e.target.value })} /></Field>
          </div>
          <Field label="Evidence" htmlFor="ge"><Textarea id="ge" rows={2} value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add goal</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
