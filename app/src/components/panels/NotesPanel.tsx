import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Badge } from "../ui";
import { Select, Textarea } from "../controls";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDateTime, CONTACT_TYPE_LABEL, hoursFromMinutes } from "../../lib/labels";
import { FileText } from "lucide-react";
import type { Note, ContactType, Goal, Plan } from "../../types/database";

const CONTACT_TYPES: ContactType[] = ["phone", "email", "face_to_face", "sms", "internal", "other"];

export function NotesPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [notes, setNotes] = React.useState<Note[] | null>(null);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [scHours, setScHours] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [f, setF] = React.useState({
    body: "", contact_type: "phone" as ContactType, minutes: "", billable: true, goal_id: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const [{ data, error }, { data: g }, { data: pl }] = await Promise.all([
      supabase.from("notes").select("*").eq("participant_id", participantId).order("occurred_at", { ascending: false }),
      supabase.from("goals").select("*").eq("participant_id", participantId),
      supabase.from("plans").select("support_coordination_hours").eq("participant_id", participantId).order("is_current", { ascending: false }).limit(1),
    ]);
    if (error) setError(error.message);
    else setNotes((data as Note[]) ?? []);
    setGoals((g as Goal[]) ?? []);
    setScHours(((pl as Plan[]) ?? [])[0]?.support_coordination_hours ?? null);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.body.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("notes").insert({
      org_id: currentOrg.id, participant_id: participantId, body: f.body.trim(),
      contact_type: f.contact_type, minutes: f.minutes ? Number(f.minutes) : null,
      billable: f.billable, goal_id: f.goal_id || null, occurred_at: new Date().toISOString(),
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ body: "", contact_type: "phone", minutes: "", billable: true, goal_id: "" });
    await load(); onActivity();
  }

  const billableMin = (notes ?? []).filter((n) => n.billable).reduce((s, n) => s + (n.minutes ?? 0), 0);
  const billableHrs = billableMin / 60;

  return (
    <div className="space-y-4">
      {/* Billable summary */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-canvas p-3 text-sm">
        <span className="text-ink-500">Billable time logged: <span className="font-semibold text-ink">{hoursFromMinutes(billableMin)}</span></span>
        {scHours != null && (
          <span className="text-ink-500">
            of <span className="font-medium text-ink">{scHours}h</span> SC allocation
            <span className={`ml-1 ${billableHrs > scHours ? "text-status-red" : "text-status-green"}`}>
              ({Math.max(0, scHours - billableHrs).toFixed(1)}h left)
            </span>
          </span>
        )}
      </div>

      {/* Add case note */}
      <form onSubmit={add} className="space-y-2 rounded-lg border border-line p-3">
        <Textarea rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
          placeholder="Case note — what happened, what was discussed, next steps…" />
        <div className="flex flex-wrap items-end gap-2">
          <Select className="w-36" value={f.contact_type} onChange={(e) => setF({ ...f, contact_type: e.target.value as ContactType })} aria-label="Contact type">
            {CONTACT_TYPES.map((t) => <option key={t} value={t}>{CONTACT_TYPE_LABEL[t]}</option>)}
          </Select>
          <input type="number" min="0" step="5" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })}
            placeholder="Mins" className="h-10 w-24 rounded-md border border-line bg-surface px-3 text-sm text-ink" aria-label="Minutes" />
          {goals.length > 0 && (
            <Select className="w-44" value={f.goal_id} onChange={(e) => setF({ ...f, goal_id: e.target.value })} aria-label="Linked goal">
              <option value="">No goal</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={f.billable} onChange={(e) => setF({ ...f, billable: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            Billable
          </label>
          <Button type="submit" size="sm" loading={saving} disabled={!f.body.trim()} className="ml-auto">Add note</Button>
        </div>
      </form>

      {loading ? <LoadingState label="Loading notes…" /> : error ? <ErrorState message={error} onRetry={load} />
        : !notes || notes.length === 0 ? (
          <EmptyState icon={FileText} title="No case notes yet" description="Record contacts and progress. Billable time rolls up against the plan's SC allocation." />
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-line bg-surface p-3">
                <p className="whitespace-pre-wrap text-sm text-ink">{n.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  {n.contact_type && <Badge tone="brand">{CONTACT_TYPE_LABEL[n.contact_type]}</Badge>}
                  {n.minutes ? <span>{hoursFromMinutes(n.minutes)}</span> : null}
                  {n.billable ? <Badge tone="green">Billable</Badge> : <Badge tone="neutral">Non-billable</Badge>}
                  <span className="ml-auto">{fmtDateTime(n.occurred_at ?? n.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
