import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Dialog } from "./dialog";
import { Button, Field, Input } from "./ui";
import { Select, Textarea } from "./controls";
import type { Participant, TaskPriority } from "../types/database";

export function AddTaskModal({
  open,
  onClose,
  onCreated,
  participants,
  defaultParticipantId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  participants: Participant[];
  defaultParticipantId?: string;
}) {
  const { currentOrg, session } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({
    title: "", description: "", participant_id: defaultParticipantId ?? "",
    due_date: "", priority: "medium" as TaskPriority,
  });

  React.useEffect(() => {
    if (open) setF((s) => ({ ...s, participant_id: defaultParticipantId ?? "" }));
  }, [open, defaultParticipantId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.title.trim()) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from("tasks").insert({
      org_id: currentOrg.id, title: f.title.trim(), description: f.description || null,
      participant_id: f.participant_id || null, due_date: f.due_date || null,
      priority: f.priority, assigned_to: session?.user.id ?? null, created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ title: "", description: "", participant_id: "", due_date: "", priority: "medium" });
    onCreated();
  }

  return (
    <Dialog open={open} onClose={onClose} title="New task" description="General or linked to a participant.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Task" htmlFor="tt"><Input id="tt" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What needs doing?" /></Field>
        <Field label="Participant (optional)" htmlFor="tp" hint="Leave blank for a general task.">
          <Select id="tp" value={f.participant_id} onChange={(e) => setF({ ...f, participant_id: e.target.value })}>
            <option value="">General — not linked to a participant</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.preferred_name || p.first_name} {p.last_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Due date" htmlFor="td"><Input id="td" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <Field label="Priority" htmlFor="tpr">
            <Select id="tpr" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as TaskPriority })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </Select>
          </Field>
        </div>
        <Field label="Details (optional)" htmlFor="tdesc"><Textarea id="tdesc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add task</Button>
        </div>
      </form>
    </Dialog>
  );
}
