import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { AddParticipantModal } from "../components/AddParticipantModal";
import { RAG_LABEL, RAG_TONE, SWR_FLOW, SWR_LABEL, PARTICIPANT_STATUS_LABEL } from "../lib/labels";
import type { Participant, SwrStatus } from "../types/database";

export default function Dashboard() {
  const { currentOrg, profile } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = React.useState<Participant[] | null>(null);
  const [funnel, setFunnel] = React.useState<Record<string, number>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    const [{ data, error }, { data: fn }] = await Promise.all([
      supabase.from("participants").select("*").eq("org_id", currentOrg.id).order("updated_at", { ascending: false }),
      supabase.rpc("swr_funnel", { p_org: currentOrg.id }),
    ]);
    if (error) setError(error.message);
    else setParticipants((data as Participant[]) ?? []);
    const f: Record<string, number> = {};
    for (const row of (fn as { status: SwrStatus; count: number }[]) ?? []) f[row.status] = Number(row.count);
    setFunnel(f);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => {
    const c = { total: 0, green: 0, amber: 0, red: 0 };
    for (const p of participants ?? []) { c.total++; c[p.rag_status]++; }
    return c;
  }, [participants]);

  const requestTotal = SWR_FLOW.reduce((s, st) => s + (funnel[st] ?? 0), 0);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Good day, {firstName}</h1>
          <p className="text-sm text-ink-500">Here's your caseload at a glance.</p>
        </div>
        <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add participant</Button>
      </div>

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

      <Card>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-semibold text-ink">Caseload</h2>
          <span className="text-sm text-ink-500">{counts.total} participants</span>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <LoadingState label="Loading caseload…" />
          ) : error ? (
            <div className="p-5"><ErrorState message={error} onRetry={load} /></div>
          ) : (participants?.length ?? 0) === 0 ? (
            <div className="p-5">
              <EmptyState icon={Users} title="No participants yet"
                description="Add your first participant to start tracking their plan, goals, referrals and tasks."
                action={<Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add participant</Button>} />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {participants!.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <button onClick={() => navigate(`/participants/${p.id}`)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-brand-50/50">
                    <div>
                      <p className="font-medium text-ink">{p.preferred_name || p.first_name} {p.last_name}</p>
                      <p className="text-xs text-ink-500">
                        {[p.suburb, p.state].filter(Boolean).join(", ") || "No location"} · {PARTICIPANT_STATUS_LABEL[p.status]}
                      </p>
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
  const dot: Record<string, string> = {
    brand: "bg-brand-500", green: "bg-status-green", amber: "bg-status-amber", red: "bg-status-red",
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />{label}
        </div>
        <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      </CardBody>
    </Card>
  );
}
