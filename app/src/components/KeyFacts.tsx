import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Button } from "./ui";
import { CalendarClock, Wallet, PhoneCall } from "lucide-react";
import { fmtDate, daysUntil, money } from "../lib/labels";
import type { Participant, Plan, FundingCategory } from "../types/database";

export function KeyFacts({
  participant,
  onParticipantChange,
  onActivity,
}: {
  participant: Participant;
  onParticipantChange: () => void;
  onActivity: () => void;
}) {
  const { currentOrg, session } = useAuth();
  const p = participant;
  const [reviewDate, setReviewDate] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [logging, setLogging] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const [{ data: plans }, { data: funds }] = await Promise.all([
        supabase.from("plans").select("reassessment_due,end_date,is_current")
          .eq("participant_id", p.id).order("is_current", { ascending: false }).limit(1),
        supabase.from("funding_categories").select("remaining").eq("participant_id", p.id),
      ]);
      const pl = ((plans as Plan[]) ?? [])[0];
      setReviewDate(pl?.reassessment_due ?? pl?.end_date ?? null);
      const fs = (funds as Pick<FundingCategory, "remaining">[]) ?? [];
      setRemaining(fs.length ? fs.reduce((s, f) => s + (f.remaining ?? 0), 0) : null);
    })();
  }, [p.id]);

  const reviewDays = daysUntil(reviewDate);
  const nextDue = p.last_contact_at && p.check_in_frequency_days
    ? new Date(new Date(p.last_contact_at).getTime() + p.check_in_frequency_days * 86400000).toISOString()
    : null;
  const overdue = nextDue ? daysUntil(nextDue)! < 0 : false;

  async function logCheckIn() {
    if (!currentOrg) return;
    setLogging(true);
    const now = new Date().toISOString();
    await supabase.from("participants").update({ last_contact_at: now }).eq("id", p.id);
    await supabase.from("timeline_events").insert({
      org_id: currentOrg.id, participant_id: p.id, event_type: "call",
      title: "Check-in logged", created_by: session?.user.id ?? null,
    });
    setLogging(false);
    onParticipantChange();
    onActivity();
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Fact
        icon={CalendarClock}
        label="Plan review"
        value={reviewDays == null ? "No plan date" : reviewDays < 0 ? `Overdue ${Math.abs(reviewDays)}d` : `${reviewDays} days`}
        sub={reviewDate ? fmtDate(reviewDate) : "Add on NDIS Plan tab"}
        tone={reviewDays == null ? "neutral" : reviewDays < 0 ? "red" : reviewDays <= 60 ? "amber" : "neutral"}
      />
      <Fact
        icon={Wallet}
        label="Funding remaining"
        value={remaining == null ? "Not tracked" : money(remaining)}
        sub={remaining == null ? "Add on Funding tab" : "Across all categories"}
        tone="neutral"
      />
      <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${overdue ? "bg-status-amber/10 text-status-amber" : "bg-brand-50 text-brand-600"}`}>
            <PhoneCall className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">Last contact</p>
            <p className="text-sm font-medium text-ink">
              {p.last_contact_at ? fmtDate(p.last_contact_at) : "Never"}
              {overdue && <span className="ml-1 text-status-amber">· due</span>}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" loading={logging} onClick={logCheckIn}>Log check-in</Button>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub: string; tone: "neutral" | "amber" | "red";
}) {
  const toneCls = tone === "red" ? "bg-status-red/10 text-status-red"
    : tone === "amber" ? "bg-status-amber/10 text-status-amber" : "bg-brand-50 text-brand-600";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
        <p className="text-sm font-medium text-ink">{value}</p>
        <p className="text-xs text-ink-500">{sub}</p>
      </div>
    </div>
  );
}
