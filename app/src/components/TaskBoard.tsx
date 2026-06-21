import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, NotebookPen } from "lucide-react";
import { Badge, Button } from "./ui";
import { TASK_PRIORITY_TONE } from "../lib/labels";

export type BoardTask = {
  id: string; title: string; due_date: string | null; status: string; priority: string;
  participant_id: string | null; participantName: string | null;
};

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TaskBoard({
  tasks, view, onReschedule, onToggle, onLog,
}: {
  tasks: BoardTask[];
  view: "week" | "day";
  onReschedule: (id: string, date: string | null) => void;
  onToggle: (t: BoardTask) => void;
  onLog: (t: BoardTask) => void;
}) {
  const [anchor, setAnchor] = React.useState(() => new Date());
  const today = ymd(new Date());

  const days: Date[] = React.useMemo(() => {
    if (view === "day") return [new Date(anchor)];
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  }, [anchor, view]);

  const active = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
  const visibleDates = new Set(days.map(ymd));
  const backlog = view === "week"
    ? active.filter((t) => !t.due_date || (!visibleDates.has(t.due_date) && t.due_date < ymd(days[0])))
    : [];

  function shift(n: number) {
    const d = new Date(anchor); d.setDate(d.getDate() + (view === "week" ? n * 7 : n)); setAnchor(d);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
        <Button variant="outline" size="sm" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        <span className="ml-2 text-sm font-medium text-ink">
          {view === "week"
            ? `${days[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
            : days[0].toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      <div className={view === "week" ? "grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8" : "grid grid-cols-1 gap-2"}>
        {view === "week" && (
          <Column title="Backlog" sub="No date / overdue" dropDate={null} onReschedule={onReschedule} highlight={false}>
            {backlog.map((t) => <Card key={t.id} t={t} onToggle={onToggle} onLog={onLog} />)}
          </Column>
        )}
        {days.map((d) => {
          const key = ymd(d);
          const items = active.filter((t) => t.due_date === key);
          return (
            <Column key={key} title={view === "week" ? DOW[(d.getDay() + 6) % 7] : "Tasks"}
              sub={d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
              dropDate={key} onReschedule={onReschedule} highlight={key === today}>
              {items.map((t) => <Card key={t.id} t={t} onToggle={onToggle} onLog={onLog} />)}
            </Column>
          );
        })}
      </div>
    </div>
  );
}

function Column({
  title, sub, dropDate, onReschedule, highlight, children,
}: {
  title: string; sub: string; dropDate: string | null;
  onReschedule: (id: string, date: string | null) => void; highlight: boolean; children: React.ReactNode;
}) {
  const [over, setOver] = React.useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData("id"); if (id) onReschedule(id, dropDate); }}
      className={`flex min-h-[8rem] flex-col rounded-lg border p-2 ${over ? "border-brand-500 bg-brand-50" : highlight ? "border-brand-200 bg-brand-50/40" : "border-line bg-brand-50/30"}`}
    >
      <div className="px-1 pb-1.5">
        <p className="text-xs font-semibold text-ink">{title}</p>
        <p className="text-[11px] text-ink-500">{sub}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Card({ t, onToggle, onLog }: { t: BoardTask; onToggle: (t: BoardTask) => void; onLog: (t: BoardTask) => void }) {
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData("id", t.id)}
      className="cursor-grab rounded-md border border-line bg-surface p-2 shadow-card active:cursor-grabbing">
      <div className="flex items-start gap-2">
        <button onClick={() => onToggle(t)} className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line hover:border-status-green" aria-label="Complete">
          {t.status === "done" && <Check className="h-3 w-3 text-status-green" />}
        </button>
        <p className="flex-1 text-xs font-medium text-ink">{t.title}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="truncate text-[11px] text-ink-500">
          {t.participantName && t.participant_id
            ? <Link to={`/participants/${t.participant_id}`} className="text-brand-700 hover:underline">{t.participantName}</Link>
            : "General"}
        </span>
        <div className="flex items-center gap-1">
          {t.participant_id && (
            <button onClick={() => onLog(t)} title="Log note & charge" className="rounded p-0.5 text-ink-500 hover:bg-brand-50 hover:text-brand-700">
              <NotebookPen className="h-3.5 w-3.5" />
            </button>
          )}
          <Badge tone={TASK_PRIORITY_TONE[t.priority as keyof typeof TASK_PRIORITY_TONE] ?? "neutral"}>{t.priority}</Badge>
        </div>
      </div>
    </div>
  );
}
