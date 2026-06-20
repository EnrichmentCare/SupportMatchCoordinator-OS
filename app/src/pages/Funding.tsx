import * as React from "react";
import { Link } from "react-router-dom";
import { Wallet, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { money } from "../lib/labels";
import type { FundingCategory, Participant } from "../types/database";

type Row = FundingCategory & {
  participants: Pick<Participant, "id" | "first_name" | "last_name" | "preferred_name"> | null;
};

type Agg = {
  participantId: string;
  name: string;
  allocated: number;
  used: number;
  remaining: number;
  alert: boolean;
};

export default function Funding() {
  const { currentOrg } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("funding_categories")
      .select("*, participants(id,first_name,last_name,preferred_name)")
      .eq("org_id", currentOrg.id);
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const aggs = React.useMemo<Agg[]>(() => {
    const map = new Map<string, Agg>();
    for (const r of rows ?? []) {
      if (!r.participants) continue;
      const id = r.participants.id;
      const a = map.get(id) ?? {
        participantId: id,
        name: `${r.participants.preferred_name || r.participants.first_name} ${r.participants.last_name}`,
        allocated: 0, used: 0, remaining: 0, alert: false,
      };
      a.allocated += r.allocated; a.used += r.used; a.remaining += r.remaining;
      const pct = r.allocated > 0 ? (r.used / r.allocated) * 100 : 0;
      if (r.alert_threshold != null && pct >= r.alert_threshold) a.alert = true;
      map.set(id, a);
    }
    return [...map.values()].sort((x, y) => Number(y.alert) - Number(x.alert) || y.used / (y.allocated || 1) - x.used / (x.allocated || 1));
  }, [rows]);

  const totals = aggs.reduce((a, x) => { a.allocated += x.allocated; a.remaining += x.remaining; return a; }, { allocated: 0, remaining: 0 });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Funding</h1>
        <p className="text-sm text-ink-500">Budget health across your caseload.</p>
      </div>

      {loading ? <LoadingState label="Loading funding…" />
        : error ? <ErrorState message={error} onRetry={load} />
        : aggs.length === 0 ? (
          <EmptyState icon={Wallet} title="No funding tracked yet"
            description="Add funding categories on a participant's Funding tab to see budget health here." />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Participants tracked" value={aggs.length.toString()} />
              <Stat label="Total allocated" value={money(totals.allocated)} />
              <Stat label="Total remaining" value={money(totals.remaining)} />
            </div>
            <Card>
              <CardBody className="p-0">
                <ul className="divide-y divide-line">
                  {aggs.map((a) => {
                    const pct = a.allocated > 0 ? Math.min(100, Math.round((a.used / a.allocated) * 100)) : 0;
                    return (
                      <li key={a.participantId} className="px-5 py-3">
                        <div className="flex items-center justify-between">
                          <Link to={`/participants/${a.participantId}`} className="font-medium text-ink hover:text-brand-700">{a.name}</Link>
                          {a.alert && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> Low balance</Badge>}
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-50">
                          <div className={`h-full ${a.alert ? "bg-status-red" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-ink-500">
                          <span>{pct}% used</span>
                          <span>{money(a.remaining)} remaining of {money(a.allocated)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          </>
        )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardBody>
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </CardBody></Card>
  );
}
