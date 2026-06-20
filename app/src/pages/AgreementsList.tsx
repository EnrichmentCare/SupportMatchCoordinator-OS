import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileSignature } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { fmtDate, daysUntil } from "../lib/labels";
import type { ServiceAgreement, Participant } from "../types/database";

type Row = ServiceAgreement & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };
const STATUS_TONE: Record<string, "neutral" | "amber" | "green" | "red"> = { draft: "neutral", sent: "amber", signed: "green", declined: "red" };

export default function AgreementsList() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("service_agreements")
      .select("*, participants(first_name,last_name,preferred_name)")
      .eq("org_id", currentOrg.id).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Service agreements</h1>
        <p className="text-sm text-ink-500">All agreements across your caseload.</p>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : (rows?.length ?? 0) === 0 ? (
          <EmptyState icon={FileSignature} title="No agreements yet" description="Generate one from a participant's Agreements tab." />
        ) : (
          <Card><CardBody className="p-0">
            <ul className="divide-y divide-line">
              {rows!.map((a) => {
                const pName = a.participants ? `${a.participants.preferred_name || a.participants.first_name} ${a.participants.last_name}` : "—";
                const exp = daysUntil(a.end_date);
                return (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <button onClick={() => navigate(`/agreements/${a.id}`)} className="font-medium text-ink hover:text-brand-700">{a.title}</button>
                      <p className="text-xs text-ink-500">
                        <Link to={`/participants/${a.participant_id}`} className="text-brand-700 hover:underline">{pName}</Link>
                        {a.end_date ? ` · ends ${fmtDate(a.end_date)}` : ""}
                        {exp != null && exp >= 0 && exp <= 30 ? <span className="ml-1 text-status-amber">(expiring)</span> : null}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardBody></Card>
        )}
    </div>
  );
}
