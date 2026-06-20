import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Select } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { FUNDING_BUCKET_LABEL, money } from "../../lib/labels";
import { Wallet, Plus, AlertTriangle } from "lucide-react";
import type { FundingBucket, FundingCategory, Plan } from "../../types/database";

const BUCKETS: FundingBucket[] = ["core", "capacity_building", "capital"];

export function FundingPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [rows, setRows] = React.useState<FundingCategory[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({ bucket: "core" as FundingBucket, name: "", allocated: "", used: "", alert_threshold: "80" });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data: planRows } = await supabase.from("plans").select("*")
      .eq("participant_id", participantId).order("is_current", { ascending: false }).limit(1);
    const pl = ((planRows as Plan[]) ?? [])[0] ?? null;
    setPlan(pl);
    const { data, error } = await supabase.from("funding_categories").select("*")
      .eq("participant_id", participantId).order("bucket");
    if (error) setError(error.message);
    else setRows((data as FundingCategory[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !plan || !f.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("funding_categories").insert({
      org_id: currentOrg.id, plan_id: plan.id, participant_id: participantId,
      bucket: f.bucket, name: f.name.trim(),
      allocated: Number(f.allocated || 0), used: Number(f.used || 0),
      alert_threshold: Number(f.alert_threshold || 80), created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ bucket: "core", name: "", allocated: "", used: "", alert_threshold: "80" });
    setAdding(false); await load(); onActivity();
  }

  async function remove(id: string) {
    await supabase.from("funding_categories").delete().eq("id", id);
    load();
  }

  if (loading) return <LoadingState label="Loading funding…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  if (!plan) {
    return <EmptyState icon={Wallet} title="Add an NDIS plan first"
      description="Funding categories attach to a plan. Add the participant's plan on the NDIS Plan tab, then track Core, Capacity Building and Capital here." />;
  }

  const totals = (rows ?? []).reduce((a, r) => {
    a.allocated += r.allocated; a.used += r.used; a.remaining += r.remaining; return a;
  }, { allocated: 0, used: 0, remaining: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-500">
          Total remaining <span className="font-semibold text-ink">{money(totals.remaining)}</span> of {money(totals.allocated)}
        </div>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add category</Button>
      </div>

      {(!rows || rows.length === 0) ? (
        <EmptyState icon={Wallet} title="No funding categories yet"
          description="Add Core, Capacity Building or Capital categories with allocated and used amounts."
          action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add category</Button>} />
      ) : (
        BUCKETS.filter((b) => rows!.some((r) => r.bucket === b)).map((b) => (
          <div key={b} className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">{FUNDING_BUCKET_LABEL[b]}</h3>
            {rows!.filter((r) => r.bucket === b).map((r) => {
              const pct = r.allocated > 0 ? Math.min(100, Math.round((r.used / r.allocated) * 100)) : 0;
              const alert = r.alert_threshold != null && pct >= r.alert_threshold;
              return (
                <div key={r.id} className="rounded-lg border border-line bg-surface p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{r.name}</span>
                    <div className="flex items-center gap-2">
                      {alert && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> {pct}% used</Badge>}
                      <button onClick={() => remove(r.id)} className="text-xs text-ink-500 hover:text-status-red">Remove</button>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
                    <div className={`h-full ${alert ? "bg-status-red" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-ink-500">
                    <span>{money(r.used)} used</span>
                    <span>{money(r.remaining)} remaining of {money(r.allocated)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add funding category">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bucket" htmlFor="bk">
              <Select id="bk" value={f.bucket} onChange={(e) => setF({ ...f, bucket: e.target.value as FundingBucket })}>
                {BUCKETS.map((b) => <option key={b} value={b}>{FUNDING_BUCKET_LABEL[b]}</option>)}
              </Select>
            </Field>
            <Field label="Category name" htmlFor="nm"><Input id="nm" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Assistance with Daily Life" /></Field>
            <Field label="Allocated ($)" htmlFor="al"><Input id="al" type="number" min="0" value={f.allocated} onChange={(e) => setF({ ...f, allocated: e.target.value })} /></Field>
            <Field label="Used ($)" htmlFor="us"><Input id="us" type="number" min="0" value={f.used} onChange={(e) => setF({ ...f, used: e.target.value })} /></Field>
            <Field label="Alert at % used" htmlFor="at"><Input id="at" type="number" min="0" max="100" value={f.alert_threshold} onChange={(e) => setF({ ...f, alert_threshold: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add category</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
