import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Textarea } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDate } from "../../lib/labels";
import { FileSignature, Plus, FileText } from "lucide-react";
import type { Participant, ServiceAgreement } from "../../types/database";

const STATUS_TONE: Record<string, "neutral" | "amber" | "green" | "red"> = {
  draft: "neutral", sent: "amber", signed: "green", declined: "red",
};

export function AgreementsPanel({ participant, onActivity }: { participant: Participant; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<ServiceAgreement[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({
    title: "Support Coordination Service Agreement", start_date: "", end_date: "",
    supports: "Support coordination — connecting you with supports, coordinating services, and monitoring your plan.",
    terms: "Delivered at NDIS Price Guide rates. Either party may end this agreement with 14 days notice.",
    parties: `${participant.first_name} ${participant.last_name} and ${currentOrg?.name ?? ""}`,
  });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("service_agreements").select("*")
      .eq("participant_id", participant.id).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as ServiceAgreement[]) ?? []);
    setLoading(false);
  }, [participant.id]);

  React.useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setSaving(true);
    const { data, error } = await supabase.from("service_agreements").insert({
      org_id: currentOrg.id, participant_id: participant.id, title: f.title,
      start_date: f.start_date || null, end_date: f.end_date || null,
      supports: f.supports || null, terms: f.terms || null, parties: f.parties || null,
      status: "draft", created_by: session?.user.id ?? null,
    }).select("id").single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    setAdding(false); await load(); onActivity();
    navigate(`/agreements/${(data as { id: string }).id}`);
  }

  async function setStatus(a: ServiceAgreement, status: string) {
    await supabase.from("service_agreements").update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : a.sent_at,
      signed_at: status === "signed" ? new Date().toISOString() : a.signed_at,
    }).eq("id", a.id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Generate and track service agreements.</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New agreement</Button>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : !rows || rows.length === 0 ? (
          <EmptyState icon={FileSignature} title="No agreements yet"
            description="Generate a branded service agreement from this participant's details, then track it to signed."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New agreement</Button>} />
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
                <div>
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-ink-500">
                    {a.start_date ? `${fmtDate(a.start_date)} – ${fmtDate(a.end_date)}` : "No dates"}
                    {a.signed_at ? ` · signed ${fmtDate(a.signed_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status}</Badge>
                  {a.status === "draft" && <button onClick={() => setStatus(a, "sent")} className="text-xs font-medium text-brand-700 hover:underline">Mark sent</button>}
                  {a.status === "sent" && <button onClick={() => setStatus(a, "signed")} className="text-xs font-medium text-brand-700 hover:underline">Mark signed</button>}
                  <button onClick={() => navigate(`/agreements/${a.id}`)} className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                    <FileText className="h-3.5 w-3.5" /> View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="New service agreement" size="lg">
        <form onSubmit={create} className="space-y-4">
          <Field label="Title" htmlFor="at"><Input id="at" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" htmlFor="as"><Input id="as" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
            <Field label="End date" htmlFor="ae"><Input id="ae" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Supports provided" htmlFor="asup"><Textarea id="asup" rows={2} value={f.supports} onChange={(e) => setF({ ...f, supports: e.target.value })} /></Field>
          <Field label="Terms" htmlFor="aterms"><Textarea id="aterms" rows={2} value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} /></Field>
          <Field label="Parties" htmlFor="ap"><Input id="ap" value={f.parties} onChange={(e) => setF({ ...f, parties: e.target.value })} /></Field>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Generate</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
