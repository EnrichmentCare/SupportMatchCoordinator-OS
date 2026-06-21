import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody } from "../components/ui";
import { LoadingState, ErrorState } from "../components/states";
import {
  RAG_LABEL, PARTICIPANT_STATUS_LABEL, REFERRAL_BOARD, REFERRAL_STAGE_LABEL,
  SWR_FLOW, SWR_LABEL, money,
} from "../lib/labels";
import type {
  Participant, Referral, FundingCategory, SwrStatus, RagStatus, ParticipantStatus, ReferralStage,
} from "../types/database";

export default function Reports() {
  const { currentOrg } = useAuth();
  const [data, setData] = React.useState<{
    participants: Participant[]; referrals: Referral[]; funnel: Record<string, number>;
    funds: Pick<FundingCategory, "allocated" | "used" | "remaining" | "alert_threshold" | "participant_id">[];
    providers: number; tasksOpen: number; tasksOverdue: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const [pp, rf, fn, fd, pv, to, tov] = await Promise.all([
      supabase.from("participants").select("*").eq("org_id", currentOrg.id),
      supabase.from("referrals").select("*").eq("org_id", currentOrg.id),
      supabase.rpc("swr_funnel", { p_org: currentOrg.id }),
      supabase.from("funding_categories").select("allocated,used,remaining,alert_threshold,participant_id").eq("org_id", currentOrg.id),
      supabase.from("providers").select("id", { count: "exact", head: true }).eq("org_id", currentOrg.id),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("org_id", currentOrg.id).in("status", ["open", "in_progress", "blocked"]),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("org_id", currentOrg.id).in("status", ["open", "in_progress", "blocked"]).lt("due_date", today),
    ]);
    if (pp.error) { setError(pp.error.message); setLoading(false); return; }
    const funnel: Record<string, number> = {};
    for (const r of (fn.data as { status: SwrStatus; count: number }[]) ?? []) funnel[r.status] = Number(r.count);
    setData({
      participants: (pp.data as Participant[]) ?? [],
      referrals: (rf.data as Referral[]) ?? [],
      funnel,
      funds: (fd.data as never[]) ?? [],
      providers: pv.count ?? 0,
      tasksOpen: to.count ?? 0,
      tasksOverdue: tov.count ?? 0,
    });
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Error"} onRetry={load} />;

  const rag: Record<RagStatus, number> = { green: 0, amber: 0, red: 0 };
  const status: Record<string, number> = {};
  for (const p of data.participants) { rag[p.rag_status]++; status[p.status] = (status[p.status] ?? 0) + 1; }

  const stage: Record<string, number> = {};
  for (const r of data.referrals) stage[r.stage] = (stage[r.stage] ?? 0) + 1;

  const fundTotals = data.funds.reduce((a, f) => {
    a.allocated += f.allocated; a.remaining += f.remaining; return a;
  }, { allocated: 0, remaining: 0 });
  const lowSet = new Set<string>();
  for (const f of data.funds) {
    const pct = f.allocated > 0 ? (f.used / f.allocated) * 100 : 0;
    if (f.alert_threshold != null && pct >= f.alert_threshold) lowSet.add(f.participant_id);
  }
  const requestsTotal = SWR_FLOW.reduce((s, k) => s + (data.funnel[k] ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-ink-500">A snapshot of your caseload and pipeline.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Participants" value={data.participants.length} />
        <Stat label="Open tasks" value={data.tasksOpen} sub={`${data.tasksOverdue} overdue`} tone={data.tasksOverdue ? "amber" : "neutral"} />
        <Stat label="Active referrals" value={data.referrals.filter((r) => REFERRAL_BOARD.includes(r.stage as ReferralStage)).length} />
        <Stat label="Provider requests" value={requestsTotal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Caseload health (RAG)">
          {(["green", "amber", "red"] as RagStatus[]).map((k) => (
            <BarRow key={k} label={RAG_LABEL[k]} value={rag[k]} max={data.participants.length}
              color={k === "green" ? "var(--status-green)" : k === "amber" ? "var(--status-amber)" : "var(--status-red)"} />
          ))}
        </Panel>

        <Panel title="Participants by status">
          {Object.keys(status).length === 0 ? <Empty /> :
            Object.entries(status).map(([k, v]) => (
              <BarRow key={k} label={PARTICIPANT_STATUS_LABEL[k as ParticipantStatus] ?? k} value={v} max={data.participants.length} />
            ))}
        </Panel>

        <Panel title="Referral pipeline">
          {data.referrals.length === 0 ? <Empty /> :
            REFERRAL_BOARD.map((s) => (
              <BarRow key={s} label={REFERRAL_STAGE_LABEL[s]} value={stage[s] ?? 0} max={data.referrals.length} />
            ))}
        </Panel>

        <Panel title="Support Match request funnel">
          {requestsTotal === 0 ? <Empty /> :
            SWR_FLOW.map((s) => (
              <BarRow key={s} label={SWR_LABEL[s]} value={data.funnel[s] ?? 0} max={requestsTotal} color="var(--accent-500)" />
            ))}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Funding allocated" value={money(fundTotals.allocated)} />
        <Stat label="Funding remaining" value={money(fundTotals.remaining)} />
        <Stat label="Low-funding alerts" value={lowSet.size} tone={lowSet.size ? "red" : "neutral"} />
        <Stat label="Providers" value={data.providers} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone = "neutral" }: {
  label: string; value: number | string; sub?: string; tone?: "neutral" | "amber" | "red";
}) {
  const c = tone === "red" ? "text-status-red" : tone === "amber" ? "text-status-amber" : "text-ink";
  return (
    <Card><CardBody>
      <p className="text-sm text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${c}`}>{value}</p>
      {sub && <p className="text-xs text-ink-500">{sub}</p>}
    </CardBody></Card>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b border-line p-5"><h2 className="font-semibold text-ink">{title}</h2></div>
      <CardBody className="space-y-2.5">{children}</CardBody>
    </Card>
  );
}

function BarRow({ label, value, max, color = "var(--brand-500)" }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-ink-500">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Empty() {
  return <p className="py-4 text-center text-sm text-ink-500">No data yet.</p>;
}
