import * as React from "react";
import { Link } from "react-router-dom";
import { Receipt, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Field, Input } from "../components/ui";
import { Select } from "../components/controls";
import { Dialog } from "../components/dialog";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { money } from "../lib/labels";
import type { ChargeItem } from "../types/database";

export default function ChargeItems() {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<ChargeItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({ code: "", name: "", unit: "hour", unit_price: "", gst_code: "P2" });

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("charge_items").select("*").eq("org_id", currentOrg.id).order("code");
    if (error) setError(error.message);
    else setRows((data as ChargeItem[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.code.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("charge_items").insert({
      org_id: currentOrg.id, code: f.code.trim(), name: f.name || null, unit: f.unit,
      unit_price: f.unit_price ? Number(f.unit_price) : null, gst_code: f.gst_code, created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ code: "", name: "", unit: "hour", unit_price: "", gst_code: "P2" });
    setAdding(false); load();
  }

  async function toggle(it: ChargeItem) {
    await supabase.from("charge_items").update({ active: !it.active }).eq("id", it.id);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Charge items</h1>
          <p className="text-sm text-ink-500">Your NDIS price-list line items, used when logging billable notes.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/import"><Button variant="outline">Bulk import</Button></Link>
          <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add item</Button>
        </div>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : (rows?.length ?? 0) === 0 ? (
          <EmptyState icon={Receipt} title="No charge items yet"
            description="Add your support-coordination line items (or bulk-import from the NDIS Pricing Arrangements) so charges price automatically."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add item</Button>} />
        ) : (
          <Card><CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-ink-500"><tr>
                <th className="px-4 py-2 font-medium">Code</th><th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Unit</th><th className="px-4 py-2 font-medium text-right">Price</th>
                <th className="px-4 py-2 font-medium">GST</th><th className="px-4 py-2"></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows!.map((it) => (
                  <tr key={it.id} className={it.active ? "" : "opacity-50"}>
                    <td className="px-4 py-2 font-mono text-xs">{it.code}</td>
                    <td className="px-4 py-2 text-ink">{it.name || "—"}</td>
                    <td className="px-4 py-2">{it.unit}</td>
                    <td className="px-4 py-2 text-right">{it.unit_price != null ? money(it.unit_price) : "—"}</td>
                    <td className="px-4 py-2"><Badge tone="neutral">{it.gst_code || "—"}</Badge></td>
                    <td className="px-4 py-2 text-right"><button onClick={() => toggle(it)} className="text-xs text-ink-500 hover:text-ink">{it.active ? "Disable" : "Enable"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody></Card>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add charge item">
        <form onSubmit={add} className="space-y-4">
          <Field label="Support item number" htmlFor="ci"><Input id="ci" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="07_002_0106_8_3" /></Field>
          <Field label="Name" htmlFor="cn"><Input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Coordination of Supports" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit" htmlFor="cu">
              <Select id="cu" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
                <option value="hour">Hour</option><option value="each">Each</option><option value="km">Km</option>
              </Select>
            </Field>
            <Field label="Unit price" htmlFor="cp"><Input id="cp" type="number" min="0" step="0.01" value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} /></Field>
            <Field label="GST code" htmlFor="cg">
              <Select id="cg" value={f.gst_code} onChange={(e) => setF({ ...f, gst_code: e.target.value })}>
                <option value="P2">P2</option><option value="P1">P1</option><option value="">—</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
