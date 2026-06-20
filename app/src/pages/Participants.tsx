import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Input } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { AddParticipantModal } from "../components/AddParticipantModal";
import { RAG_LABEL, RAG_TONE, PARTICIPANT_STATUS_LABEL } from "../lib/labels";
import type { Participant } from "../types/database";

export default function Participants() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<Participant[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [adding, setAdding] = React.useState(false);

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
    else setRows((data as Participant[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.preferred_name ?? ""} ${p.suburb ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [rows, q]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Participants</h1>
          <p className="text-sm text-ink-500">Your full caseload.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <UserPlus className="h-4 w-4" /> Add participant
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <Input className="pl-9" placeholder="Search by name or suburb" value={q}
          onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <LoadingState label="Loading participants…" />
          ) : error ? (
            <div className="p-5"><ErrorState message={error} onRetry={load} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Users}
                title={rows && rows.length > 0 ? "No matches" : "No participants yet"}
                description={rows && rows.length > 0
                  ? "Try a different search."
                  : "Add your first participant to start tracking their plan, goals, referrals and tasks."}
                action={!rows?.length ? (
                  <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add participant</Button>
                ) : undefined}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => navigate(`/participants/${p.id}`)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-brand-50/50"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {p.preferred_name || p.first_name} {p.last_name}
                      </p>
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

      <AddParticipantModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(id) => { setAdding(false); navigate(`/participants/${id}`); }}
      />
    </div>
  );
}
