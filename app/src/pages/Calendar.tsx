import * as React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { fmtDateTime } from "../lib/labels";
import type { Meeting, Participant } from "../types/database";

type Row = Meeting & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };

export default function Calendar() {
  const { currentOrg } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("meetings")
      .select("*, participants(first_name,last_name,preferred_name)")
      .eq("org_id", currentOrg.id).order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const upcoming = (rows ?? []).filter((m) => m.scheduled_at && new Date(m.scheduled_at).getTime() >= now);
  const past = (rows ?? []).filter((m) => !m.scheduled_at || new Date(m.scheduled_at).getTime() < now).reverse();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
        <p className="text-sm text-ink-500">Meetings and appointments across your caseload.</p>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : (rows?.length ?? 0) === 0 ? (
          <EmptyState icon={CalendarDays} title="No meetings yet" description="Meetings you add on a participant appear here." />
        ) : (
          <>
            <Group title="Upcoming" rows={upcoming} empty="Nothing scheduled." />
            <Group title="Past" rows={past} empty="" />
          </>
        )}
    </div>
  );
}

function Group({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  if (rows.length === 0 && !empty) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-ink-500">{empty}</p> : (
        <Card><CardBody className="p-0">
          <ul className="divide-y divide-line">
            {rows.map((m) => {
              const pName = m.participants ? `${m.participants.preferred_name || m.participants.first_name} ${m.participants.last_name}` : null;
              return (
                <li key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-ink">{m.title}</p>
                    <p className="text-xs text-ink-500">
                      {pName && m.participant_id && <Link to={`/participants/${m.participant_id}`} className="text-brand-700 hover:underline">{pName}</Link>}
                      {m.location && <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                    </p>
                  </div>
                  <span className="text-sm text-ink-500">{fmtDateTime(m.scheduled_at)}</span>
                </li>
              );
            })}
          </ul>
        </CardBody></Card>
      )}
    </div>
  );
}
