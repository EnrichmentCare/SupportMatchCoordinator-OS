import * as React from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Check, Plus, LayoutList, CalendarRange, CalendarDays } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Input } from "../components/ui";
import { Select } from "../components/controls";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { AddTaskModal } from "../components/AddTaskModal";
import { TaskBoard, type BoardTask } from "../components/TaskBoard";
import { QuickLogModal } from "../components/QuickLogModal";
import { fmtDate, daysUntil, TASK_STATUS_LABEL, TASK_PRIORITY_TONE } from "../lib/labels";
import type { Task, Participant, TaskStatus, TaskPriority } from "../types/database";

const pName = (p: { first_name: string; last_name: string; preferred_name: string | null } | null) =>
  p ? `${p.preferred_name || p.first_name} ${p.last_name}` : null;

type TaskRow = Task & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };

type Bucket = "overdue" | "today" | "week" | "later" | "nodate";
const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue", today: "Today", week: "This week", later: "Later", nodate: "No due date",
};
const BUCKET_ORDER: Bucket[] = ["overdue", "today", "week", "later", "nodate"];

function bucketOf(t: TaskRow): Bucket {
  const d = daysUntil(t.due_date);
  if (d == null) return "nodate";
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 7) return "week";
  return "later";
}

export default function Tasks() {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<TaskRow[] | null>(null);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDone, setShowDone] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [view, setView] = React.useState<"list" | "week" | "day">("week");
  const [logTarget, setLogTarget] = React.useState<{ id: string; name: string } | null>(null);

  // Quick-add row state
  const [qTitle, setQTitle] = React.useState("");
  const [qParticipant, setQParticipant] = React.useState("");
  const [qDue, setQDue] = React.useState("");
  const [qPriority, setQPriority] = React.useState<TaskPriority>("medium");
  const [qSaving, setQSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const [{ data, error }, { data: pp }] = await Promise.all([
      supabase.from("tasks").select("*, participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("participants").select("*").eq("org_id", currentOrg.id).order("first_name"),
    ]);
    if (error) setError(error.message);
    else setRows((data as TaskRow[]) ?? []);
    setParticipants((pp as Participant[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !qTitle.trim()) return;
    setQSaving(true);
    const { error } = await supabase.from("tasks").insert({
      org_id: currentOrg.id, title: qTitle.trim(), participant_id: qParticipant || null,
      due_date: qDue || null, priority: qPriority, assigned_to: session?.user.id ?? null,
      created_by: session?.user.id ?? null,
    });
    setQSaving(false);
    if (error) { setError(error.message); return; }
    setQTitle(""); setQParticipant(""); setQDue(""); setQPriority("medium");
    load();
  }

  async function toggleDone(t: { id: string; status: string }) {
    const next: TaskStatus = t.status === "done" ? "open" : "done";
    const { error } = await supabase.from("tasks")
      .update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    if (!error) load();
  }

  async function reschedule(id: string, date: string | null) {
    setRows((prev) => prev?.map((t) => (t.id === id ? { ...t, due_date: date } : t)) ?? null);
    await supabase.from("tasks").update({ due_date: date }).eq("id", id);
  }

  const boardTasks: BoardTask[] = (rows ?? []).map((t) => ({
    id: t.id, title: t.title, due_date: t.due_date, status: t.status, priority: t.priority,
    participant_id: t.participant_id, participantName: pName(t.participants),
  }));

  const open = (rows ?? []).filter((t) => t.status !== "done" && t.status !== "cancelled");
  const done = (rows ?? []).filter((t) => t.status === "done");
  const grouped = React.useMemo(() => {
    const g: Record<Bucket, TaskRow[]> = { overdue: [], today: [], week: [], later: [], nodate: [] };
    for (const t of open) g[bucketOf(t)].push(t);
    return g;
  }, [open]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tasks</h1>
          <p className="text-sm text-ink-500">Everything on your plate — general and per-participant.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> New task</Button>
      </div>

      {/* Quick add */}
      <Card>
        <CardBody>
          <form onSubmit={quickAdd} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="Quick add a task…" />
            </div>
            <Select className="w-44" value={qParticipant} onChange={(e) => setQParticipant(e.target.value)} aria-label="Participant">
              <option value="">General</option>
              {participants.map((p) => <option key={p.id} value={p.id}>{p.preferred_name || p.first_name} {p.last_name}</option>)}
            </Select>
            <Input type="date" className="w-40" value={qDue} onChange={(e) => setQDue(e.target.value)} />
            <Select className="w-28" value={qPriority} onChange={(e) => setQPriority(e.target.value as TaskPriority)} aria-label="Priority">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </Select>
            <Button type="submit" loading={qSaving} disabled={!qTitle.trim()}>Add</Button>
          </form>
        </CardBody>
      </Card>

      {/* View toggle */}
      <div className="flex gap-1">
        {([["week", "Week", CalendarRange], ["day", "Day", CalendarDays], ["list", "List", LayoutList]] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? "bg-brand-100 text-brand-700" : "text-ink-500 hover:bg-brand-50"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState label="Loading tasks…" />
        : error ? <ErrorState message={error} onRetry={load} />
        : view !== "list" ? (
          <TaskBoard tasks={boardTasks} view={view} onReschedule={reschedule} onToggle={toggleDone}
            onLog={(t) => setLogTarget({ id: t.participant_id!, name: t.participantName ?? "participant" })} />
        ) : open.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No open tasks"
            description="Use the quick-add above to capture anything you need to do — for a participant or in general." />
        ) : (
          <div className="space-y-5">
            {BUCKET_ORDER.filter((b) => grouped[b].length > 0).map((b) => (
              <div key={b}>
                <h2 className={`mb-2 text-sm font-semibold ${b === "overdue" ? "text-status-red" : "text-ink"}`}>
                  {BUCKET_LABEL[b]} <span className="text-ink-500">· {grouped[b].length}</span>
                </h2>
                <Card><CardBody className="p-0">
                  <ul className="divide-y divide-line">
                    {grouped[b].map((t) => <TaskItem key={t.id} t={t} onToggle={toggleDone} />)}
                  </ul>
                </CardBody></Card>
              </div>
            ))}
          </div>
        )}

      {/* Completed */}
      {view === "list" && done.length > 0 && (
        <div>
          <button onClick={() => setShowDone((s) => !s)} className="text-sm font-medium text-brand-700 hover:underline">
            {showDone ? "Hide" : "Show"} completed ({done.length})
          </button>
          {showDone && (
            <Card className="mt-2"><CardBody className="p-0">
              <ul className="divide-y divide-line">
                {done.map((t) => <TaskItem key={t.id} t={t} onToggle={toggleDone} />)}
              </ul>
            </CardBody></Card>
          )}
        </div>
      )}

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); load(); }} participants={participants} />

      {logTarget && (
        <QuickLogModal open onClose={() => setLogTarget(null)} participantId={logTarget.id}
          participantName={logTarget.name} onSaved={load} />
      )}
    </div>
  );
}

function TaskItem({ t, onToggle }: { t: TaskRow; onToggle: (t: TaskRow) => void }) {
  const pName = t.participants
    ? `${t.participants.preferred_name || t.participants.first_name} ${t.participants.last_name}` : null;
  const overdue = t.status !== "done" && (daysUntil(t.due_date) ?? 1) < 0;
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <button onClick={() => onToggle(t)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          t.status === "done" ? "border-status-green bg-status-green text-white" : "border-line"}`} aria-label="Toggle done">
        {t.status === "done" && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1">
        <p className={`text-sm ${t.status === "done" ? "text-ink-500 line-through" : "text-ink"}`}>{t.title}</p>
        <p className="text-xs text-ink-500">
          <span className={overdue ? "text-status-red" : ""}>{t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"}</span>
          {" · "}{TASK_STATUS_LABEL[t.status]}
          {" · "}
          {pName && t.participant_id
            ? <Link to={`/participants/${t.participant_id}`} className="text-brand-700 hover:underline">{pName}</Link>
            : <span>General</span>}
        </p>
      </div>
      <Badge tone={TASK_PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
    </li>
  );
}
