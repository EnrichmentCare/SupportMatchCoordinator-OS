import * as React from "react";
import {
  FileText, Phone, Mail, MessageSquare, GitBranch, File, Users, CheckSquare,
  UserSearch, Target, Wallet, ShieldCheck, ArrowRightLeft, Cog, Clock,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDateTime, TIMELINE_LABEL } from "../../lib/labels";
import type { TimelineEvent, TimelineEventType } from "../../types/database";

const ICON: Record<TimelineEventType, React.ComponentType<{ className?: string }>> = {
  note: FileText, call: Phone, email: Mail, sms: MessageSquare, referral: GitBranch,
  document: File, meeting: Users, task: CheckSquare, support_worker_request: UserSearch,
  goal: Target, funding: Wallet, consent: ShieldCheck, status_change: ArrowRightLeft, system: Cog,
};

export function TimelineFeed({ participantId, refreshKey }: { participantId: string; refreshKey: number }) {
  const [events, setEvents] = React.useState<TimelineEvent[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("participant_id", participantId)
      .order("occurred_at", { ascending: false });
    if (error) setError(error.message);
    else setEvents((data as TimelineEvent[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) return <LoadingState label="Loading timeline…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!events || events.length === 0)
    return (
      <EmptyState
        icon={Clock}
        title="Nothing here yet"
        description="Notes, tasks, documents and service provider requests will appear on this timeline automatically."
      />
    );

  return (
    <ol className="relative space-y-4 pl-2">
      {events.map((e) => {
        const Icon = ICON[e.event_type] ?? Cog;
        return (
          <li key={e.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">{e.title}</p>
                <span className="shrink-0 text-xs text-ink-500">{fmtDateTime(e.occurred_at)}</span>
              </div>
              {e.body && <p className="mt-0.5 text-sm text-ink-500">{e.body}</p>}
              <span className="mt-1 inline-block text-[11px] uppercase tracking-wide text-ink-500/70">
                {TIMELINE_LABEL[e.event_type]}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
