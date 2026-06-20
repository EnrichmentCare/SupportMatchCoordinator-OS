import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input } from "../ui";
import { Textarea, TagsInput } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDateTime } from "../../lib/labels";
import { Users, Plus, MapPin } from "lucide-react";
import type { Meeting } from "../../types/database";

export function MeetingsPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<Meeting[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({ title: "", scheduled_at: "", location: "", attendees: [] as string[], notes: "", outcomes: "", actions: "" });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("meetings").select("*")
      .eq("participant_id", participantId).order("scheduled_at", { ascending: false, nullsFirst: false });
    if (error) setError(error.message);
    else setRows((data as Meeting[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("meetings").insert({
      org_id: currentOrg.id, participant_id: participantId, title: f.title.trim(),
      scheduled_at: f.scheduled_at ? new Date(f.scheduled_at).toISOString() : null,
      location: f.location || null, attendees: f.attendees,
      notes: f.notes || null, outcomes: f.outcomes || null, actions: f.actions || null,
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ title: "", scheduled_at: "", location: "", attendees: [], notes: "", outcomes: "", actions: "" });
    setAdding(false); await load(); onActivity();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Meetings, attendees, outcomes and actions.</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add meeting</Button>
      </div>

      {loading ? <LoadingState label="Loading meetings…" /> : error ? <ErrorState message={error} onRetry={load} />
        : !rows || rows.length === 0 ? (
          <EmptyState icon={Users} title="No meetings yet"
            description="Record meet & greets, plan reviews and check-ins with outcomes and actions."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add meeting</Button>} />
        ) : (
          <ul className="space-y-3">
            {rows.map((m) => (
              <li key={m.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{m.title}</p>
                  <span className="text-xs text-ink-500">{fmtDateTime(m.scheduled_at)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  {m.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                  {m.attendees?.length ? <span>{m.attendees.join(", ")}</span> : null}
                </div>
                {m.outcomes && <p className="mt-2 text-sm text-ink"><span className="font-medium">Outcomes:</span> {m.outcomes}</p>}
                {m.actions && <p className="mt-1 text-sm text-ink-500"><span className="font-medium">Actions:</span> {m.actions}</p>}
                {m.notes && <p className="mt-1 text-sm text-ink-500">{m.notes}</p>}
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add meeting" size="lg">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" htmlFor="mt"><Input id="mt" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Plan review meeting" /></Field>
            <Field label="When" htmlFor="mw"><Input id="mw" type="datetime-local" value={f.scheduled_at} onChange={(e) => setF({ ...f, scheduled_at: e.target.value })} /></Field>
            <Field label="Location" htmlFor="ml"><Input id="ml" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="In person / Zoom / phone" /></Field>
            <Field label="Attendees" htmlFor="ma"><TagsInput id="ma" value={f.attendees} onChange={(v) => setF({ ...f, attendees: v })} /></Field>
          </div>
          <Field label="Notes" htmlFor="mn"><Textarea id="mn" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <Field label="Outcomes" htmlFor="mo"><Textarea id="mo" rows={2} value={f.outcomes} onChange={(e) => setF({ ...f, outcomes: e.target.value })} /></Field>
          <Field label="Actions" htmlFor="mac"><Textarea id="mac" rows={2} value={f.actions} onChange={(e) => setF({ ...f, actions: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add meeting</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
