import * as React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { fmtDateTime } from "../lib/labels";
import type { ParticipantIncident, Participant } from "../types/database";

type Row = ParticipantIncident & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };

const SEV_TONE: Record<string, "neutral" | "amber" | "red"> = { low: "neutral", medium: "amber", high: "red", critical: "red" };

function addBusinessDays(iso: string, days: number) {
  const d = new Date(iso); let a = 0;
  while (a < days) { d.setDate(d.getDate() + 1); const day = d.getDay(); if (day !== 0 && day !== 6) a++; }
  return d;
}

export default function Incidents() {
  const { currentOrg } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reportableOnly, setReportableOnly] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("participant_incidents")
      .select("*, participants(first_name,last_name,preferred_name)")
      .eq("org_id", currentOrg.id).order("occurred_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const visible = (rows ?? []).filter((r) => !reportableOnly || r.reportable);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Incidents</h1>
          <p className="text-sm text-ink-500">Reportable incidents across your caseload, with Commission deadlines.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500">
          <input type="checkbox" checked={reportableOnly} onChange={(e) => setReportableOnly(e.target.checked)} className="h-4 w-4 accent-brand-700" />
          Reportable only
        </label>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : visible.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No incidents" description="Incidents logged on a participant's Risk tab appear here." />
        ) : (
          <Card><CardBody className="p-0">
            <ul className="divide-y divide-line">
              {visible.map((i) => {
                const pName = i.participants ? `${i.participants.preferred_name || i.participants.first_name} ${i.participants.last_name}` : "—";
                const notifyOverdue = i.reportable && !i.notified_at && Date.now() > new Date(i.occurred_at).getTime() + 24 * 3600000;
                const followDue = i.reportable && !i.follow_up_submitted_at ? addBusinessDays(i.occurred_at, 5) : null;
                return (
                  <li key={i.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {i.severity && <Badge tone={SEV_TONE[i.severity] ?? "neutral"}>{i.severity}</Badge>}
                        {i.reportable && <Badge tone="red">Reportable</Badge>}
                        <Badge tone="neutral">{i.status}</Badge>
                        <Link to={`/participants/${i.participant_id}`} className="text-xs text-brand-700 hover:underline">{pName}</Link>
                      </div>
                      <span className="text-xs text-ink-500">{fmtDateTime(i.occurred_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink">{i.summary}</p>
                    {i.reportable && (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {i.notified_at ? <Badge tone="green">Notified</Badge> : <Badge tone={notifyOverdue ? "red" : "amber"}>{notifyOverdue ? "24h notify overdue" : "Notify within 24h"}</Badge>}
                        {i.follow_up_submitted_at ? <Badge tone="green">Follow-up done</Badge> : followDue && <Badge tone="amber">Follow-up by {followDue.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Badge>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardBody></Card>
        )}
    </div>
  );
}
