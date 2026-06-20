import * as React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody } from "../components/ui";
import { Select } from "../components/controls";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { hoursFromMinutes } from "../lib/labels";

type NoteRow = {
  minutes: number | null; billable: boolean | null; created_by: string | null;
  occurred_at: string | null; created_at: string; participant_id: string | null;
  participants: { first_name: string; last_name: string; preferred_name: string | null } | null;
};

function startOf(period: "week" | "month" | "all") {
  if (period === "all") return null;
  const d = new Date();
  if (period === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d;
}

export default function Billing() {
  const { currentOrg } = useAuth();
  const [notes, setNotes] = React.useState<NoteRow[] | null>(null);
  const [names, setNames] = React.useState<Map<string, string>>(new Map());
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<"week" | "month" | "all">("week");

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const [{ data, error }, { data: mems }] = await Promise.all([
      supabase.from("notes")
        .select("minutes,billable,created_by,occurred_at,created_at,participant_id,participants(first_name,last_name,preferred_name)")
        .eq("org_id", currentOrg.id).not("participant_id", "is", null),
      supabase.from("memberships").select("user_id,profiles(full_name)").eq("org_id", currentOrg.id),
    ]);
    if (error) setError(error.message);
    else setNotes((data as unknown as NoteRow[]) ?? []);
    const m = new Map<string, string>();
    for (const x of (mems as unknown as { user_id: string; profiles: { full_name: string | null } | null }[]) ?? [])
      m.set(x.user_id, x.profiles?.full_name ?? "Unknown");
    setNames(m);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const start = startOf(period);
  const inRange = (notes ?? []).filter((n) => {
    if (!start) return true;
    const t = new Date(n.occurred_at ?? n.created_at);
    return t >= start;
  });

  const totals = inRange.reduce((a, n) => {
    const m = n.minutes ?? 0;
    if (n.billable) a.billable += m; else a.nonBillable += m;
    return a;
  }, { billable: 0, nonBillable: 0 });

  const byCoord = new Map<string, { min: number; count: number }>();
  for (const n of inRange) if (n.billable) {
    const k = n.created_by ?? "—";
    const v = byCoord.get(k) ?? { min: 0, count: 0 };
    v.min += n.minutes ?? 0; v.count++;
    byCoord.set(k, v);
  }
  const leaderboard = [...byCoord.entries()].map(([k, v]) => ({ name: names.get(k) ?? "Unknown", ...v }))
    .sort((a, b) => b.min - a.min);

  const byParticipant = new Map<string, { name: string; min: number }>();
  for (const n of inRange) if (n.billable && n.participant_id) {
    const nm = n.participants ? `${n.participants.preferred_name || n.participants.first_name} ${n.participants.last_name}` : "—";
    const v = byParticipant.get(n.participant_id) ?? { name: nm, min: 0 };
    v.min += n.minutes ?? 0;
    byParticipant.set(n.participant_id, v);
  }
  const participantRows = [...byParticipant.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.min - a.min);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Billable hours</h1>
          <p className="text-sm text-ink-500">Support-coordination time from case notes.</p>
        </div>
        <Select className="w-40" value={period} onChange={(e) => setPeriod(e.target.value as "week" | "month" | "all")}>
          <option value="week">This week</option><option value="month">This month</option><option value="all">All time</option>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Billable" value={hoursFromMinutes(totals.billable)} tone="brand" />
        <Stat label="Non-billable" value={hoursFromMinutes(totals.nonBillable)} tone="neutral" />
        <Stat label="Billable %" value={`${totals.billable + totals.nonBillable > 0 ? Math.round((totals.billable / (totals.billable + totals.nonBillable)) * 100) : 0}%`} tone="neutral" />
      </div>

      <Card>
        <div className="border-b border-line p-5"><h2 className="font-semibold text-ink">Coordinator leaderboard</h2></div>
        <CardBody className="p-0">
          {leaderboard.length === 0 ? <div className="p-5"><EmptyState icon={Clock} title="No billable time yet" description="Log billable case notes to see hours here." /></div> : (
            <ul className="divide-y divide-line">
              {leaderboard.map((c, i) => (
                <li key={c.name + i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{i + 1}</span>
                    <span className="font-medium text-ink">{c.name}</span>
                  </div>
                  <span className="text-sm text-ink-500">{hoursFromMinutes(c.min)} · {c.count} notes</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {participantRows.length > 0 && (
        <Card>
          <div className="border-b border-line p-5"><h2 className="font-semibold text-ink">Billable hours by participant</h2></div>
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {participantRows.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3">
                  <Link to={`/participants/${p.id}`} className="font-medium text-ink hover:text-brand-700">{p.name}</Link>
                  <span className="text-sm text-ink-500">{hoursFromMinutes(p.min)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "brand" | "neutral" }) {
  return (
    <Card><CardBody>
      <p className="text-sm text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "brand" ? "text-brand-700" : "text-ink"}`}>{value}</p>
    </CardBody></Card>
  );
}
