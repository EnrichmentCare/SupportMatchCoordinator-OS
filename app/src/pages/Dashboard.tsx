import * as React from "react";
import { Users, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import type { Participant, RagStatus } from "../types/database";

const RAG_LABEL: Record<RagStatus, string> = { green: "On track", amber: "Needs attention", red: "Urgent" };

export default function Dashboard() {
  const { currentOrg, profile } = useAuth();
  const [participants, setParticipants] = React.useState<Participant[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    else setParticipants((data as Participant[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => {
    const c = { total: 0, green: 0, amber: 0, red: 0 };
    for (const p of participants ?? []) {
      c.total++;
      c[p.rag_status]++;
    }
    return c;
  }, [participants]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Good day, {firstName}</h1>
          <p className="text-sm text-ink-500">Here's your caseload at a glance.</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4" /> Add participant
        </Button>
      </div>

      {/* RAG stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total participants" value={counts.total} tone="brand" />
        <StatCard label="On track" value={counts.green} tone="green" />
        <StatCard label="Needs attention" value={counts.amber} tone="amber" />
        <StatCard label="Urgent" value={counts.red} tone="red" />
      </div>

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
              <EmptyState
                icon={Users}
                title="No participants yet"
                description="Add your first participant to start tracking their plan, goals, referrals and tasks."
                action={<Button><UserPlus className="h-4 w-4" /> Add participant</Button>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {participants!.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-brand-50/50">
                  <div>
                    <p className="font-medium text-ink">
                      {p.preferred_name || p.first_name} {p.last_name}
                    </p>
                    <p className="text-xs text-ink-500">
                      {[p.suburb, p.state].filter(Boolean).join(", ") || "No location"} · {p.status}
                    </p>
                  </div>
                  <Badge tone={p.rag_status}>{RAG_LABEL[p.rag_status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, tone,
}: { label: string; value: number; tone: "brand" | "green" | "amber" | "red" }) {
  const dot: Record<string, string> = {
    brand: "bg-brand-500", green: "bg-status-green", amber: "bg-status-amber", red: "bg-status-red",
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span className={`h-2 w-2 rounded-full ${dot[tone]}`} />
          {label}
        </div>
        <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
      </CardBody>
    </Card>
  );
}
