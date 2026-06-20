import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Select, Textarea, TagsInput } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDateTime } from "../../lib/labels";
import { ShieldAlert, Plus, Pencil } from "lucide-react";
import type { Participant, ParticipantIncident } from "../../types/database";

const SEV_TONE: Record<string, "neutral" | "amber" | "red"> = {
  low: "neutral", medium: "amber", high: "red", critical: "red",
};

function addBusinessDays(iso: string, days: number) {
  const d = new Date(iso);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}
function hoursUntil(d: Date) { return Math.round((d.getTime() - Date.now()) / 3600000); }

export function RiskPanel({
  participant,
  onParticipantChange,
  onActivity,
}: {
  participant: Participant;
  onParticipantChange: () => void;
  onActivity: () => void;
}) {
  const { currentOrg, session } = useAuth();
  const p = participant;
  const [incidents, setIncidents] = React.useState<ParticipantIncident[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [logging, setLogging] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("participant_incidents").select("*")
      .eq("participant_id", p.id).order("occurred_at", { ascending: false });
    if (error) setError(error.message);
    else setIncidents((data as ParticipantIncident[]) ?? []);
    setLoading(false);
  }, [p.id]);

  React.useEffect(() => { load(); }, [load]);

  async function markNotified(id: string) {
    await supabase.from("participant_incidents").update({ notified_at: new Date().toISOString(), status: "reported" }).eq("id", id);
    load();
  }
  async function markFollowUp(id: string) {
    await supabase.from("participant_incidents").update({ follow_up_submitted_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      {/* Safeguarding summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Safeguarding</h3>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(p.risk_flags ?? []).length === 0
            ? <span className="text-sm text-ink-500">No risk flags.</span>
            : p.risk_flags!.map((r) => <Badge key={r} tone="red">{r}</Badge>)}
        </div>
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Detail label="Behaviour support plan" value={p.behaviour_support_plan ? "Yes" : "No"} />
          <Detail label="Restrictive practices" value={p.restrictive_practices} />
          <Detail label="Crisis plan" value={p.crisis_plan} />
          <div className="col-span-2 sm:col-span-3"><Detail label="Risk notes" value={p.risk_notes} /></div>
        </dl>
      </div>

      {/* Incidents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Reportable incidents</h3>
          <Button size="sm" onClick={() => setLogging(true)}><Plus className="h-4 w-4" /> Log incident</Button>
        </div>
        {loading ? <LoadingState label="Loading incidents…" /> : error ? <ErrorState message={error} onRetry={load} />
          : !incidents || incidents.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No incidents logged"
              description="Record reportable incidents with severity, actions taken and status." />
          ) : (
            <ul className="space-y-2">
              {incidents.map((i) => {
                const notifyH = hoursUntil(new Date(new Date(i.occurred_at).getTime() + 24 * 3600000));
                const followDeadline = addBusinessDays(i.occurred_at, 5);
                const followH = hoursUntil(followDeadline);
                return (
                  <li key={i.id} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i.severity && <Badge tone={SEV_TONE[i.severity] ?? "neutral"}>{i.severity}</Badge>}
                        {i.reportable && <Badge tone="red">Reportable</Badge>}
                        <Badge tone="neutral">{i.status}</Badge>
                      </div>
                      <span className="text-xs text-ink-500">{fmtDateTime(i.occurred_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink">{i.summary}</p>
                    {i.actions && <p className="mt-1 text-xs text-ink-500"><span className="font-medium">Actions:</span> {i.actions}</p>}

                    {i.reportable && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-xs">
                        {/* 24-hour notification */}
                        {i.notified_at ? (
                          <Badge tone="green">Notified {fmtDateTime(i.notified_at)}</Badge>
                        ) : (
                          <>
                            <Badge tone={notifyH < 0 ? "red" : notifyH <= 6 ? "amber" : "neutral"}>
                              {notifyH < 0 ? `Notify overdue by ${Math.abs(notifyH)}h` : `Notify Commission in ${notifyH}h`}
                            </Badge>
                            <button onClick={() => markNotified(i.id)} className="font-medium text-brand-700 hover:underline">Mark notified</button>
                          </>
                        )}
                        {/* 5-business-day follow-up */}
                        {i.follow_up_submitted_at ? (
                          <Badge tone="green">Follow-up done</Badge>
                        ) : (
                          <>
                            <Badge tone={followH < 0 ? "red" : followH <= 48 ? "amber" : "neutral"}>
                              {followH < 0 ? "Follow-up overdue" : `Follow-up by ${followDeadline.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
                            </Badge>
                            <button onClick={() => markFollowUp(i.id)} className="font-medium text-brand-700 hover:underline">Mark submitted</button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </div>

      <SafeguardingForm participant={p} open={editing} onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); onParticipantChange(); }} />
      <IncidentForm participantId={p.id} orgId={currentOrg?.id} userId={session?.user.id}
        open={logging} onClose={() => setLogging(false)}
        onSaved={() => { setLogging(false); load(); onActivity(); }} />
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

function SafeguardingForm({ participant, open, onClose, onSaved }: {
  participant: Participant; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({
    risk_flags: participant.risk_flags ?? [],
    behaviour_support_plan: participant.behaviour_support_plan ?? false,
    restrictive_practices: participant.restrictive_practices ?? "",
    crisis_plan: participant.crisis_plan ?? "",
    risk_notes: participant.risk_notes ?? "",
  });
  React.useEffect(() => {
    setF({
      risk_flags: participant.risk_flags ?? [],
      behaviour_support_plan: participant.behaviour_support_plan ?? false,
      restrictive_practices: participant.restrictive_practices ?? "",
      crisis_plan: participant.crisis_plan ?? "",
      risk_notes: participant.risk_notes ?? "",
    });
  }, [participant, open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const { error } = await supabase.from("participants").update({
      risk_flags: f.risk_flags, behaviour_support_plan: f.behaviour_support_plan,
      restrictive_practices: f.restrictive_practices || null, crisis_plan: f.crisis_plan || null,
      risk_notes: f.risk_notes || null,
    }).eq("id", participant.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit safeguarding" size="lg">
      <form onSubmit={save} className="space-y-4">
        <Field label="Risk flags" htmlFor="rf"><TagsInput id="rf" value={f.risk_flags} onChange={(v) => setF({ ...f, risk_flags: v })} placeholder="e.g. falls risk, choking, elopement" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Behaviour support plan" htmlFor="bsp">
            <Select id="bsp" value={f.behaviour_support_plan ? "yes" : "no"} onChange={(e) => setF({ ...f, behaviour_support_plan: e.target.value === "yes" })}>
              <option value="no">No</option><option value="yes">Yes</option>
            </Select>
          </Field>
          <Field label="Restrictive practices" htmlFor="rp"><Input id="rp" value={f.restrictive_practices} onChange={(e) => setF({ ...f, restrictive_practices: e.target.value })} /></Field>
        </div>
        <Field label="Crisis / emergency plan" htmlFor="cp"><Textarea id="cp" rows={2} value={f.crisis_plan} onChange={(e) => setF({ ...f, crisis_plan: e.target.value })} /></Field>
        <Field label="Risk notes" htmlFor="rn"><Textarea id="rn" rows={2} value={f.risk_notes} onChange={(e) => setF({ ...f, risk_notes: e.target.value })} /></Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </Dialog>
  );
}

function IncidentForm({ participantId, orgId, userId, open, onClose, onSaved }: {
  participantId: string; orgId?: string; userId?: string; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({ occurred_at: "", severity: "low", category: "", summary: "", reportable: false, actions: "", status: "open" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !f.summary.trim()) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from("participant_incidents").insert({
      org_id: orgId, participant_id: participantId,
      occurred_at: f.occurred_at ? new Date(f.occurred_at).toISOString() : new Date().toISOString(),
      severity: f.severity, category: f.category || null, summary: f.summary.trim(),
      reportable: f.reportable, actions: f.actions || null, status: f.status, created_by: userId ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ occurred_at: "", severity: "low", category: "", summary: "", reportable: false, actions: "", status: "open" });
    onSaved();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Log incident" size="lg">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="When" htmlFor="iw"><Input id="iw" type="datetime-local" value={f.occurred_at} onChange={(e) => setF({ ...f, occurred_at: e.target.value })} /></Field>
          <Field label="Severity" htmlFor="is">
            <Select id="is" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </Select>
          </Field>
          <Field label="Category" htmlFor="ic"><Input id="ic" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
        </div>
        <Field label="What happened" htmlFor="isum"><Textarea id="isum" rows={2} required value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
        <Field label="Actions taken" htmlFor="ia"><Textarea id="ia" rows={2} value={f.actions} onChange={(e) => setF({ ...f, actions: e.target.value })} /></Field>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={f.reportable} onChange={(e) => setF({ ...f, reportable: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            NDIS reportable incident
          </label>
          <Select className="w-36" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="open">Open</option><option value="reported">Reported</option><option value="closed">Closed</option>
          </Select>
        </div>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Log incident</Button>
        </div>
      </form>
    </Dialog>
  );
}
