import * as React from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { RequestWorkerModal } from "./RequestWorkerModal";
import { SWR_FLOW, SWR_LABEL, fmtDate } from "../../lib/labels";
import { UserSearch } from "lucide-react";
import type { Participant, SupportWorkerRequest, SwrStatus } from "../../types/database";

function StatusStepper({ status }: { status: SwrStatus }) {
  if (status === "cancelled" || status === "closed") {
    return <span className="text-xs font-medium text-ink-500">{SWR_LABEL[status]}</span>;
  }
  const idx = SWR_FLOW.indexOf(status);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {SWR_FLOW.map((s, i) => (
        <React.Fragment key={s}>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            i <= idx ? "bg-accent-100 text-accent-600" : "bg-brand-50 text-ink-500/60"
          }`}>
            {SWR_LABEL[s]}
          </span>
          {i < SWR_FLOW.length - 1 && <span className="text-ink-500/40">›</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SupportMatchPanel({
  participant,
  onActivity,
}: {
  participant: Participant;
  onActivity: () => void;
}) {
  const [rows, setRows] = React.useState<SupportWorkerRequest[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("support_worker_requests")
      .select("*")
      .eq("participant_id", participant.id)
      .order("requested_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as SupportWorkerRequest[]) ?? []);
    setLoading(false);
  }, [participant.id]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Service provider requests sent to Support Match.</p>
        <Button variant="accent" size="sm" onClick={() => setOpen(true)}>
          <UserSearch className="h-4 w-4" /> Request a Service Provider
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading requests…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title="No requests yet"
          description="When you request a service provider, it becomes a Support Match lead and you can track it from Requested through to Placed."
          action={<Button variant="accent" onClick={() => setOpen(true)}><UserSearch className="h-4 w-4" /> Request a Service Provider</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-ink-500">{r.reference}</span>
                <span className="text-xs text-ink-500">Requested {fmtDate(r.requested_at)}</span>
              </div>
              <StatusStepper status={r.status} />
            </li>
          ))}
        </ul>
      )}

      <RequestWorkerModal
        participant={participant}
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => { setOpen(false); load(); onActivity(); }}
      />
    </div>
  );
}
