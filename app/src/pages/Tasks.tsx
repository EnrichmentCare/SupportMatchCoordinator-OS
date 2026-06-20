import * as React from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { fmtDate, TASK_STATUS_LABEL, TASK_PRIORITY_TONE } from "../lib/labels";
import type { Task, Participant, TaskStatus } from "../types/database";

type TaskRow = Task & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };

export default function Tasks() {
  const { currentOrg } = useAuth();
  const [rows, setRows] = React.useState<TaskRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDone, setShowDone] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tasks")
      .select("*, participants(first_name,last_name,preferred_name)")
      .eq("org_id", currentOrg.id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setRows((data as TaskRow[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function toggleDone(t: TaskRow) {
    const next: TaskStatus = t.status === "done" ? "open" : "done";
    const { error } = await supabase.from("tasks")
      .update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (!error) load();
  }

  const visible = (rows ?? []).filter((t) => showDone || t.status !== "done");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tasks</h1>
          <p className="text-sm text-ink-500">Everything on your plate across the caseload.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)}
            className="h-4 w-4 accent-brand-700" />
          Show completed
        </label>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <LoadingState label="Loading tasks…" />
          ) : error ? (
            <div className="p-5"><ErrorState message={error} onRetry={load} /></div>
          ) : visible.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={CheckSquare} title="No open tasks"
                description="Tasks you create on a participant show up here too." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((t) => {
                const pName = t.participants
                  ? `${t.participants.preferred_name || t.participants.first_name} ${t.participants.last_name}`
                  : null;
                return (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <button onClick={() => toggleDone(t)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        t.status === "done" ? "border-status-green bg-status-green text-white" : "border-line"
                      }`} aria-label="Toggle done">
                      {t.status === "done" && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-sm ${t.status === "done" ? "text-ink-500 line-through" : "text-ink"}`}>{t.title}</p>
                      <p className="text-xs text-ink-500">
                        {t.due_date ? `Due ${fmtDate(t.due_date)}` : "No due date"} · {TASK_STATUS_LABEL[t.status]}
                        {pName && t.participant_id && (
                          <> · <Link to={`/participants/${t.participant_id}`} className="text-brand-700 hover:underline">{pName}</Link></>
                        )}
                      </p>
                    </div>
                    <Badge tone={TASK_PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
