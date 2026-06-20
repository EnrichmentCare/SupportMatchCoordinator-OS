import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { LoadingState, ErrorState } from "../components/states";
import {
  PLAN_MGMT_LABEL, FUNDING_BUCKET_LABEL, GOAL_STATUS_LABEL, RAG_LABEL, money, fmtDate, hoursFromMinutes,
} from "../lib/labels";
import type {
  Participant, Plan, FundingCategory, Goal, ParticipantProvider, Note, ParticipantCOI,
} from "../types/database";

export default function ParticipantReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg, profile } = useAuth();
  const [d, setD] = React.useState<{
    p: Participant; plan: Plan | null; funds: FundingCategory[]; goals: Goal[];
    providers: ParticipantProvider[]; notes: Note[]; coi: ParticipantCOI[];
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    const [p, plan, funds, goals, prov, notes, coi] = await Promise.all([
      supabase.from("participants").select("*").eq("id", id).maybeSingle(),
      supabase.from("plans").select("*").eq("participant_id", id).order("is_current", { ascending: false }).limit(1),
      supabase.from("funding_categories").select("*").eq("participant_id", id),
      supabase.from("goals").select("*").eq("participant_id", id),
      supabase.from("participant_providers").select("*").eq("participant_id", id).eq("status", "active"),
      supabase.from("notes").select("*").eq("participant_id", id).order("occurred_at", { ascending: false }).limit(8),
      supabase.from("participant_coi").select("*").eq("participant_id", id),
    ]);
    if (p.error || !p.data) { setError(p.error?.message ?? "Not found"); setLoading(false); return; }
    setD({
      p: p.data as Participant, plan: ((plan.data as Plan[]) ?? [])[0] ?? null,
      funds: (funds.data as FundingCategory[]) ?? [], goals: (goals.data as Goal[]) ?? [],
      providers: (prov.data as ParticipantProvider[]) ?? [], notes: (notes.data as Note[]) ?? [],
      coi: (coi.data as ParticipantCOI[]) ?? [],
    });
    setLoading(false);
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-10"><LoadingState /></div>;
  if (error || !d) return <div className="p-10"><ErrorState message={error ?? "Error"} onRetry={load} /></div>;

  const { p } = d;
  const name = `${p.first_name} ${p.last_name}`;
  const billableMin = d.notes.reduce((s, n) => s + (n.billable ? (n.minutes ?? 0) : 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { .no-print { display:none !important; } body { background:#fff; } }`}</style>

      <div className="no-print sticky top-0 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <button onClick={() => navigate(`/participants/${id}`)} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back to participant
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10 text-ink">
        <header className="mb-6 border-b border-line pb-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">{currentOrg?.name} · Support Coordination Report</p>
          <h1 className="mt-1 text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-ink-500">
            Prepared by {profile?.full_name ?? "—"} · {fmtDate(new Date().toISOString())}
          </p>
        </header>

        <Section title="Participant details">
          <Grid items={[
            ["Preferred name", p.preferred_name], ["Date of birth", p.date_of_birth ? fmtDate(p.date_of_birth) : null],
            ["NDIS number", p.ndis_number], ["Plan management", p.plan_management ? PLAN_MGMT_LABEL[p.plan_management] : null],
            ["Location", [p.suburb, p.state, p.postcode].filter(Boolean).join(" ")], ["Status (RAG)", RAG_LABEL[p.rag_status]],
            ["Primary disability", p.primary_disability], ["Communication needs", p.communication_needs],
          ]} />
        </Section>

        {d.plan && (
          <Section title="NDIS plan">
            <Grid items={[
              ["Plan number", d.plan.plan_number], ["Start", fmtDate(d.plan.start_date)],
              ["End", fmtDate(d.plan.end_date)], ["Review due", fmtDate(d.plan.reassessment_due)],
              ["Total budget", money(d.plan.total_budget)], ["SC hours", d.plan.support_coordination_hours?.toString()],
            ]} />
          </Section>
        )}

        {d.funds.length > 0 && (
          <Section title="Funding">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-500"><th className="py-1">Category</th><th>Bucket</th><th className="text-right">Allocated</th><th className="text-right">Used</th><th className="text-right">Remaining</th></tr></thead>
              <tbody>
                {d.funds.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="py-1">{f.name}</td><td>{FUNDING_BUCKET_LABEL[f.bucket]}</td>
                    <td className="text-right">{money(f.allocated)}</td><td className="text-right">{money(f.used)}</td><td className="text-right">{money(f.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {d.goals.length > 0 && (
          <Section title="Goals & progress">
            <ul className="space-y-2">
              {d.goals.map((g) => (
                <li key={g.id}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{g.title}</span><span className="text-ink-500">{GOAL_STATUS_LABEL[g.status]} · {g.progress_pct}%</span></div>
                  {g.evidence && <p className="text-xs text-ink-500">Evidence: {g.evidence}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {d.providers.length > 0 && (
          <Section title="Supports in place">
            <ul className="text-sm">
              {d.providers.map((pr) => <li key={pr.id} className="border-t border-line py-1">{pr.provider_name}{pr.service_type ? ` — ${pr.service_type}` : ""}</li>)}
            </ul>
          </Section>
        )}

        {(p.risk_flags?.length || p.crisis_plan || p.behaviour_support_plan) && (
          <Section title="Risk & safeguarding">
            <Grid items={[
              ["Risk flags", p.risk_flags?.join(", ")], ["Behaviour support plan", p.behaviour_support_plan ? "Yes" : "No"],
              ["Restrictive practices", p.restrictive_practices], ["Crisis plan", p.crisis_plan],
            ]} />
          </Section>
        )}

        {d.coi.length > 0 && (
          <Section title="Conflicts of interest">
            <ul className="text-sm">
              {d.coi.map((c) => <li key={c.id} className="border-t border-line py-1">{c.nature}{c.related_party ? ` (${c.related_party})` : ""} — {c.disclosed ? "disclosed" : "not disclosed"}, {c.status}</li>)}
            </ul>
          </Section>
        )}

        <Section title="Recent activity">
          <p className="mb-2 text-xs text-ink-500">Billable time (recent): {hoursFromMinutes(billableMin)}</p>
          <ul className="space-y-1 text-sm">
            {d.notes.length === 0 ? <li className="text-ink-500">No notes recorded.</li> :
              d.notes.map((n) => (
                <li key={n.id} className="border-t border-line py-1">
                  <span className="text-ink-500">{fmtDate(n.occurred_at ?? n.created_at)} — </span>{n.body}
                </li>
              ))}
          </ul>
        </Section>

        <p className="mt-8 border-t border-line pt-4 text-xs text-ink-500">
          Generated by Coordinator OS. This report compiles recorded information and should be reviewed before submission to the NDIA.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ items }: { items: [string, string | null | undefined][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      {items.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}><dt className="text-ink-500">{k}</dt><dd className="text-ink">{v}</dd></div>
      ))}
    </dl>
  );
}
