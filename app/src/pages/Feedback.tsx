import * as React from "react";
import { Link } from "react-router-dom";
import { MessageSquareWarning, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Field } from "../components/ui";
import { Select, Textarea } from "../components/controls";
import { Dialog } from "../components/dialog";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { fmtDate } from "../lib/labels";
import type { Feedback as FeedbackRow, Participant } from "../types/database";

type Row = FeedbackRow & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };

const TYPE_TONE: Record<string, "red" | "amber" | "green" | "neutral"> = {
  complaint: "red", feedback: "amber", compliment: "green",
};
const STATUS_TONE: Record<string, "neutral" | "amber" | "green"> = {
  open: "amber", in_progress: "amber", resolved: "green", closed: "neutral",
};

export default function Feedback() {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({ type: "complaint", source: "participant", summary: "", severity: "medium", participant_id: "", status: "open" });

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const [{ data, error }, { data: pp }] = await Promise.all([
      supabase.from("feedback").select("*, participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id).order("received_at", { ascending: false }),
      supabase.from("participants").select("*").eq("org_id", currentOrg.id).order("first_name"),
    ]);
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setParticipants((pp as Participant[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.summary.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("feedback").insert({
      org_id: currentOrg.id, type: f.type, source: f.source, summary: f.summary.trim(),
      severity: f.severity, participant_id: f.participant_id || null, status: f.status,
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ type: "complaint", source: "participant", summary: "", severity: "medium", participant_id: "", status: "open" });
    setAdding(false); load();
  }

  async function setStatus(r: Row, status: string) {
    await supabase.from("feedback").update({
      status, resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null,
    }).eq("id", r.id);
    load();
  }

  const visible = (rows ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Feedback & complaints</h1>
          <p className="text-sm text-ink-500">Log and resolve complaints, feedback and compliments.</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Log feedback</Button>
      </div>

      <div className="flex gap-2">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm ${filter === s ? "bg-brand-700 text-white" : "bg-brand-50 text-ink-500"}`}>
            {s === "all" ? "All" : s.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : visible.length === 0 ? (
          <EmptyState icon={MessageSquareWarning} title="Nothing here"
            description="Log a complaint, piece of feedback or a compliment to start the register." />
        ) : (
          <Card><CardBody className="p-0">
            <ul className="divide-y divide-line">
              {visible.map((r) => {
                const pName = r.participants ? `${r.participants.preferred_name || r.participants.first_name} ${r.participants.last_name}` : null;
                return (
                  <li key={r.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={TYPE_TONE[r.type] ?? "neutral"}>{r.type}</Badge>
                        {r.severity && <span className="text-xs text-ink-500">{r.severity}</span>}
                        {pName && r.participant_id && <Link to={`/participants/${r.participant_id}`} className="text-xs text-brand-700 hover:underline">{pName}</Link>}
                      </div>
                      <Select className="h-8 w-36 text-xs" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
                        <option value="open">Open</option><option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option><option value="closed">Closed</option>
                      </Select>
                    </div>
                    <p className="mt-1 text-sm text-ink">{r.summary}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {r.source ? `${r.source} · ` : ""}received {fmtDate(r.received_at)}
                      <Badge tone={STATUS_TONE[r.status] ?? "neutral"} className="ml-2">{r.status.replaceAll("_", " ")}</Badge>
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardBody></Card>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Log feedback or complaint" size="lg">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Type" htmlFor="ft">
              <Select id="ft" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                <option value="complaint">Complaint</option><option value="feedback">Feedback</option><option value="compliment">Compliment</option>
              </Select>
            </Field>
            <Field label="Source" htmlFor="fs">
              <Select id="fs" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
                <option value="participant">Participant</option><option value="family">Family</option>
                <option value="provider">Provider</option><option value="worker">Worker</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Severity" htmlFor="fsev">
              <Select id="fsev" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Participant (optional)" htmlFor="fp">
            <Select id="fp" value={f.participant_id} onChange={(e) => setF({ ...f, participant_id: e.target.value })}>
              <option value="">Not linked</option>
              {participants.map((p) => <option key={p.id} value={p.id}>{p.preferred_name || p.first_name} {p.last_name}</option>)}
            </Select>
          </Field>
          <Field label="Summary" htmlFor="fsum"><Textarea id="fsum" rows={3} required value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Log</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
