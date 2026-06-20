import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input } from "../ui";
import { Select, Textarea } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDate, daysUntil, PLAN_MGMT_LABEL } from "../../lib/labels";
import { CalendarClock } from "lucide-react";
import type { Plan, PlanManagement } from "../../types/database";

export function PlanPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("participant_id", participantId)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) setError(error.message);
    else setPlan(((data as Plan[]) ?? [])[0] ?? null);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Loading plan…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const reviewDays = daysUntil(plan?.reassessment_due ?? plan?.end_date);

  return (
    <div className="space-y-4">
      {!plan ? (
        <EmptyState icon={CalendarClock} title="No plan recorded"
          description="Add the participant's NDIS plan details — dates, budget and review."
          action={<Button onClick={() => setEditing(true)}>Add plan</Button>} />
      ) : (
        <>
          {reviewDays !== null && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              reviewDays < 0 ? "border-status-red/30 bg-status-red/5 text-status-red"
              : reviewDays <= 60 ? "border-status-amber/30 bg-status-amber/5 text-status-amber"
              : "border-line bg-canvas text-ink-500"}`}>
              <CalendarClock className="h-4 w-4" />
              {reviewDays < 0 ? `Plan review overdue by ${Math.abs(reviewDays)} days`
                : `Plan review in ${reviewDays} days (${fmtDate(plan.reassessment_due ?? plan.end_date)})`}
            </div>
          )}
          <div className="flex items-start justify-between">
            <dl className="grid flex-1 grid-cols-2 gap-5 sm:grid-cols-3">
              <Detail label="Plan number" value={plan.plan_number} />
              <Detail label="Management" value={PLAN_MGMT_LABEL[plan.management_type]} />
              <Detail label="Status" value={plan.is_current ? "Current" : "Past"} />
              <Detail label="Start date" value={fmtDate(plan.start_date)} />
              <Detail label="End date" value={fmtDate(plan.end_date)} />
              <Detail label="Review due" value={fmtDate(plan.reassessment_due)} />
              <Detail label="Total budget" value={plan.total_budget != null ? `$${plan.total_budget.toLocaleString()}` : null} />
              <Detail label="Support coord. hours" value={plan.support_coordination_hours?.toString()} />
            </dl>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          </div>
          {plan.notes && <div><Detail label="Notes" value={plan.notes} /></div>}
        </>
      )}

      <PlanForm
        open={editing} onClose={() => setEditing(false)} existing={plan}
        onSaved={() => { setEditing(false); load(); onActivity(); }}
        participantId={participantId} orgId={currentOrg?.id} userId={session?.user.id}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function PlanForm({
  open, onClose, existing, onSaved, participantId, orgId, userId,
}: {
  open: boolean; onClose: () => void; existing: Plan | null; onSaved: () => void;
  participantId: string; orgId?: string; userId?: string;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({
    plan_number: "", management_type: "plan_managed" as PlanManagement,
    start_date: "", end_date: "", reassessment_due: "", total_budget: "",
    support_coordination_hours: "", notes: "",
  });

  React.useEffect(() => {
    if (existing) setF({
      plan_number: existing.plan_number ?? "", management_type: existing.management_type,
      start_date: existing.start_date ?? "", end_date: existing.end_date ?? "",
      reassessment_due: existing.reassessment_due ?? "",
      total_budget: existing.total_budget?.toString() ?? "",
      support_coordination_hours: existing.support_coordination_hours?.toString() ?? "",
      notes: existing.notes ?? "",
    });
  }, [existing, open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true); setError(null);
    const payload = {
      org_id: orgId, participant_id: participantId,
      plan_number: f.plan_number || null, management_type: f.management_type,
      start_date: f.start_date || null, end_date: f.end_date || null,
      reassessment_due: f.reassessment_due || null,
      total_budget: f.total_budget ? Number(f.total_budget) : null,
      support_coordination_hours: f.support_coordination_hours ? Number(f.support_coordination_hours) : null,
      notes: f.notes || null, is_current: true, created_by: userId ?? null,
    };
    const res = existing
      ? await supabase.from("plans").update(payload).eq("id", existing.id)
      : await supabase.from("plans").insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  }

  return (
    <Dialog open={open} onClose={onClose} title={existing ? "Edit plan" : "Add plan"} size="lg">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan number" htmlFor="pln"><Input id="pln" value={f.plan_number} onChange={(e) => setF({ ...f, plan_number: e.target.value })} /></Field>
          <Field label="Management type" htmlFor="mt">
            <Select id="mt" value={f.management_type} onChange={(e) => setF({ ...f, management_type: e.target.value as PlanManagement })}>
              <option value="plan_managed">Plan managed</option><option value="self_managed">Self managed</option><option value="agency_managed">Agency managed</option>
            </Select>
          </Field>
          <Field label="Start date" htmlFor="sd"><Input id="sd" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="End date" htmlFor="ed"><Input id="ed" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          <Field label="Review / reassessment due" htmlFor="rd"><Input id="rd" type="date" value={f.reassessment_due} onChange={(e) => setF({ ...f, reassessment_due: e.target.value })} /></Field>
          <Field label="Total budget ($)" htmlFor="tb"><Input id="tb" type="number" min="0" value={f.total_budget} onChange={(e) => setF({ ...f, total_budget: e.target.value })} /></Field>
          <Field label="Support coordination hours" htmlFor="sch"><Input id="sch" type="number" min="0" step="0.5" value={f.support_coordination_hours} onChange={(e) => setF({ ...f, support_coordination_hours: e.target.value })} /></Field>
        </div>
        <Field label="Notes" htmlFor="pn"><Textarea id="pn" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save plan</Button>
        </div>
      </form>
    </Dialog>
  );
}
