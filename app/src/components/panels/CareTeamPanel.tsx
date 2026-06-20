import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Select, Textarea } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { Building2, Phone, Mail, Plus } from "lucide-react";
import type { ParticipantProvider } from "../../types/database";

const STATUS_TONE: Record<string, "green" | "amber" | "neutral"> = {
  active: "green", pending: "amber", ended: "neutral",
};

export function CareTeamPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<ParticipantProvider[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [f, setF] = React.useState({
    provider_name: "", service_type: "", status: "active",
    contact_name: "", contact_phone: "", contact_email: "", is_plan_manager: false, notes: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("participant_providers").select("*").eq("participant_id", participantId)
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setRows((data as ParticipantProvider[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.provider_name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("participant_providers").insert({
      org_id: currentOrg.id, participant_id: participantId,
      provider_name: f.provider_name.trim(), service_type: f.service_type || null, status: f.status,
      contact_name: f.contact_name || null, contact_phone: f.contact_phone || null,
      contact_email: f.contact_email || null, is_plan_manager: f.is_plan_manager,
      notes: f.notes || null, created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ provider_name: "", service_type: "", status: "active", contact_name: "", contact_phone: "", contact_email: "", is_plan_manager: false, notes: "" });
    setAdding(false); await load(); onActivity();
  }

  async function remove(id: string) {
    await supabase.from("participant_providers").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Providers, support workers, allied health and plan manager involved.</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add provider</Button>
      </div>

      {loading ? <LoadingState label="Loading care team…" /> : error ? <ErrorState message={error} onRetry={load} />
        : !rows || rows.length === 0 ? (
          <EmptyState icon={Building2} title="No providers yet"
            description="Track who's delivering supports — service type, status and contact."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add provider</Button>} />
        ) : (
          <ul className="space-y-2">
            {rows.map((p) => (
              <li key={p.id} className="flex items-start justify-between rounded-lg border border-line bg-surface p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{p.provider_name}</p>
                    {p.service_type && <span className="text-sm text-ink-500">· {p.service_type}</span>}
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                    {p.is_plan_manager && <Badge tone="brand">Plan manager</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    {p.contact_name && <span>{p.contact_name}</span>}
                    {p.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.contact_phone}</span>}
                    {p.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{p.contact_email}</span>}
                  </div>
                  {p.notes && <p className="mt-1 text-sm text-ink-500">{p.notes}</p>}
                </div>
                <button onClick={() => remove(p.id)} className="text-xs text-ink-500 hover:text-status-red">Remove</button>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add provider / care team member" size="lg">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Provider / person" htmlFor="pn"><Input id="pn" required value={f.provider_name} onChange={(e) => setF({ ...f, provider_name: e.target.value })} /></Field>
            <Field label="Service type" htmlFor="svc"><Input id="svc" value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })} placeholder="e.g. Physio, SIL, OT" /></Field>
            <Field label="Status" htmlFor="st">
              <Select id="st" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                <option value="active">Active</option><option value="pending">Pending</option><option value="ended">Ended</option>
              </Select>
            </Field>
            <Field label="Contact name" htmlFor="cnm"><Input id="cnm" value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></Field>
            <Field label="Contact phone" htmlFor="cph"><Input id="cph" value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></Field>
            <Field label="Contact email" htmlFor="cem"><Input id="cem" type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={f.is_plan_manager} onChange={(e) => setF({ ...f, is_plan_manager: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            This is the plan manager
          </label>
          <Field label="Notes" htmlFor="nt"><Textarea id="nt" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add provider</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
