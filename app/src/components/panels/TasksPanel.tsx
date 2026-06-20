import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Input, Badge } from "../ui";
import { Select } from "../controls";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDate, TASK_STATUS_LABEL, TASK_PRIORITY_TONE } from "../../lib/labels";
import { CheckSquare, Check } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "../../types/database";

export function TasksPanel({
  participantId,
  onActivity,
}: {
  participantId: string;
  onActivity: () => void;
}) {
  const { currentOrg, session } = useAuth();
  const [tasks, setTasks] = React.useState<Task[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("medium");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("participant_id", participantId)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      org_id: currentOrg.id,
      participant_id: participantId,
      title: title.trim(),
      due_date: due || null,
      priority,
      assigned_to: session?.user.id ?? null,
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setTitle(""); setDue(""); setPriority("medium");
    await load();
    onActivity();
  }

  async function toggleDone(t: Task) {
    const next: TaskStatus = t.status === "done" ? "open" : "done";
    const { error } = await supabase.from("tasks")
      .update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (!error) { await load(); onActivity(); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addTask} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task…" />
        </div>
        <Input type="date" className="w-40" value={due} onChange={(e) => setDue(e.target.value)} />
        <Select className="w-32" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        <Button type="submit" size="sm" loading={saving} disabled={!title.trim()}>Add</Button>
      </form>

      {loading ? (
        <LoadingState label="Loading tasks…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Add a task to track follow-ups for this participant." />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
              <button
                onClick={() => toggleDone(t)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  t.status === "done" ? "border-status-green bg-status-green text-white" : "border-line"
                }`}
                aria-label="Toggle done"
              >
                {t.status === "done" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${t.status === "done" ? "text-ink-500 line-through" : "text-ink"}`}>{t.title}</p>
                <p className="text-xs text-ink-500">
                  {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"} · {TASK_STATUS_LABEL[t.status]}
                </p>
              </div>
              <Badge tone={TASK_PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
