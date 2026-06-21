import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, UserPlus, CheckSquare, CalendarDays, Cake, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { AddParticipantModal } from "../components/AddParticipantModal";
import { RAG_LABEL, RAG_TONE, SWR_FLOW, SWR_LABEL, PARTICIPANT_STATUS_LABEL, fmtDate, fmtDateTime, daysUntil } from "../lib/labels";
import type { Participant, SwrStatus, Task, Meeting } from "../types/database";

type TaskRow = Task & { participants: { first_name: string; last_name: string; preferred_name: string | null } | null };
type MeetingRow = Meeting & { participants: { first_name: string; last_name: string; preferred_name: string | null } | null };

function pn(p: { first_name: string; last_name: string; preferred_name: string | null } | null) {
  return p ? `${p.preferred_name || p.first_name} ${p.last_name}` : null;
}
function daysToBirthday(dob: string) {
  const d = new Date(dob), now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < todayMid) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next.getTime() - todayMid.getTime()) / 86400000);
}

export default function Dashboard() {
  const { currentOrg, profile } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = React.useState<Participant[] | null>(null);
  const [tasks, setTasks] = React.useState<TaskRow[]>([]);
  const [meetings, setMeetings] = React.useState<MeetingRow[]>([]);
  const [funnel, setFunnel] = React.useState<Record<string, number>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const [{ data, error }, { data: fn }, { data: tk }, { data: mt }] = await Promise.all([
      supabase.from("participants").select("*").eq("org_id", currentOrg.id).order("updated_at", { ascending: false }),
      supabase.rpc("swr_funnel", { p_org: currentOrg.id }),
      supabase.from("tasks").select("*, participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id).in("status", ["open", "in_progress", "blocked"]).lte("due_date", todayStr)
        .order("due_date", { ascending: true }),
      supabase.from("meetings").select("*, participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id).gte("scheduled_at", todayStr + "T00:00:00").lte("scheduled_at", todayStr + "T23:59:59")
        .order("scheduled_at"),
    ]);
    if (error) setError(error.message);
    else setParticipants((data as Participant[]) ?? []);
    setTasks((tk as TaskRow[]) ?? []);
    setMeetings((mt as MeetingRow[]) ?? []);
    const f: Record<string, number> = {};
    for (const row of (fn as { status: SwrStatus; count: number }[]) ?? []) f[row.status] = Number(row.count);
    setFunnel(f);
    setLoading(false);
  }, [currentOrg, todayStr]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => {
    const c = { total: 0, green: 0, amber: 0, red: 0 };
    for (const p of participants ?? []) { c.total++; c[p.rag_status]++; }
    return c;
  }, [participants]);

  const birthdays = (participants ?? [])
    .filter((p) => p.date_of_birth && daysToBirthday(p.date_of_birth!) <= 7)
    .map((p) => ({ p, d: daysToBirthday(p.date_of_birth!) }))
    .sort((a, b) => a.d - b.d);

  const requestTotal = SWR_FLOW.reduce((s, st) => s + (funnel[st] ?? 0), 0);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  async function toggleTask(id: string) {
    await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  if (loading) return <div className="mx-auto max-w-6xl"><LoadingState /></div>;
  if (error) return <div className="mx-auto max-w-6xl"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Good day, {firstName}</h1>
          <p className="text-sm text-ink-500">{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add participant</Button>
      </div>

      {/* Today */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between border-b border-line p-4">
            <span className="flex items-center gap-2 font-semibold text-ink"><CheckSquare className="h-4 w-4 text-brand-600" /> Due today & overdue</span>
            <Link to="/tasks" className="text-xs text-brand-700 hover:underline">All tasks</Link>
          </div>
          <CardBody className="p-0">
            {tasks.length === 0 ? <p className="p-4 text-sm text-ink-500">Nothing due. Nice.</p> : (
              <ul className="divide-y divide-line">
                {tasks.slice(0, 6).map((t) => {
                  const overdue = (daysUntil(t.due_date) ?? 0) < 0;
                  return (
                    <li key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                      <button onClick={() => toggleTask(t.id)} className="h-4 w-4 shrink-0 rounded border border-line hover:border-status-green" aria-label="Complete" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{t.title}</p>
                        <p className="text-xs text-ink-500">
                          <span className={overdue ? "text-status-red" : ""}>{t.due_date ? fmtDate(t.due_date) : "—"}</span>
                          {pn(t.participants) && t.participant_id && <> · <Link to={`/participants/${t.participant_id}`} className="text-brand-700 hover:underline">{pn(t.participants)}</Link></>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line p-4">
            <span className="flex items-center gap-2 font-semibold text-ink"><CalendarDays className="h-4 w-4 text-brand-600" /> Today's meetings</span>
            <Link to="/calendar" className="text-xs text-brand-700 hover:underline">Calendar</Link>
          </div>
          <CardBody className="p-0">
            {meetings.length === 0 ? <p className="p-4 text-sm text-ink-500">No meetings today.</p> : (
              <ul className="divide-y divide-line">
                {meetings.map((m) => (
                  <li key={m.id} className="px-4 py-2.5">
                    <p className="text-sm font-medium text-ink">{m.title}</p>
                    <p className="text-xs text-ink-500">{fmtDateTime(m.scheduled_at)}{pn(m.participants) ? ` · ${pn(m.participants)}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line p-4">
            <span className="flex items-center gap-2 font-semibold text-ink"><Cake className="h-4 w-4 text-brand-600" /> Birthdays</span>
          </div>
          <CardBody className="p-0">
            {birthdays.length === 0 ? <p className="p-4 text-sm text-ink-500">None in the next 7 days.</p> : (
              <ul className="divide-y divide-line">
                {birthdays.map(({ p, d }) => (
                  <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <Link to={`/participants/${p.id}`} className="text-sm font-medium text-ink hover:text-brand-700">{p.preferred_name || p.first_name} {p.last_name}</Link>
                    <span className="text-xs text-ink-500">{d === 0 ? "Today 🎉" : `${d}d`}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* RAG */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total participants" value={counts.total} tone="brand" />
        <StatCard label="On track" value={counts.green} tone="green" />
        <StatCard label="Needs attention" value={counts.amber} tone="amber" />
        <StatCard label="Urgent" value={counts.red} tone="red" />
      </div>

      {/* Support Match funnel */}
      <Card>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-semibold text-ink">Support worker requests</h2>
          <span className="text-sm text-ink-500">{requestTotal} total</span>
        </div>
        <CardBody>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {SWR_FLOW.map((st) => (
              <div key={st} className="rounded-lg border border-line bg-canvas p-3 text-center">
                <p className="text-2xl font-semibold text-ink">{funnel[st] ?? 0}</p>
                <p className="mt-1 text-xs text-ink-500">{SWR_LABEL[st]}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Caseload */}
      <Card>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-semibold text-ink">Caseload</h2>
          <Link to="/participants" className="flex items-center gap-1 text-sm text-brand-700 hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <CardBody className="p-0">
          {(participants?.length ?? 0) === 0 ? (
            <div className="p-5">
              <EmptyState icon={Users} title="No participants yet"
                description="Add your first participant, or import your caseload from Admin → Import data."
                action={<Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add participant</Button>} />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {participants!.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <button onClick={() => navigate(`/participants/${p.id}`)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-brand-50/50">
                    <div>
                      <p className="font-medium text-ink">{p.preferred_name || p.first_name} {p.last_name}</p>
                      <p className="text-xs text-ink-500">{[p.suburb, p.state].filter(Boolean).join(", ") || "No location"} · {PARTICIPANT_STATUS_LABEL[p.status]}</p>
                    </div>
                    <Badge tone={RAG_TONE[p.rag_status]}>{RAG_LABEL[p.rag_status]}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <AddParticipantModal open={adding} onClose={() => setAdding(false)}
        onCreated={(id) => { setAdding(false); navigate(`/participants/${id}`); }} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "brand" | "green" | "amber" | "red" }) {
  const dot: Record<string, string> = { brand: "bg-brand-500", green: "bg-status-green", amber: "bg-status-amber", red: "bg-status-red" };
  return (
    <Card><CardBody>
      <div className="flex items-center gap-2 text-sm text-ink-500"><span className={`h-2 w-2 rounded-full ${dot[tone]}`} />{label}</div>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </CardBody></Card>
  );
}
