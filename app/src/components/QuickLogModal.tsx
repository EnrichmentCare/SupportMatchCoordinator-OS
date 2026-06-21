import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Dialog } from "./dialog";
import { Button, Field, Input } from "./ui";
import { Select, Textarea } from "./controls";
import { money } from "../lib/labels";
import type { ChargeItem, ContactType } from "../types/database";

const CONTACT_TYPES: ContactType[] = ["phone", "email", "face_to_face", "sms", "internal", "other"];
const SERVICE_TYPES = [
  { v: "direct", l: "Direct service" }, { v: "non_face_to_face", l: "Non-face-to-face" },
  { v: "travel", l: "Travel" }, { v: "non_labour", l: "Non-labour" },
];

export function QuickLogModal({
  open, onClose, participantId, participantName, onSaved,
}: {
  open: boolean; onClose: () => void; participantId: string; participantName?: string; onSaved?: () => void;
}) {
  const { currentOrg, session } = useAuth();
  const [items, setItems] = React.useState<ChargeItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({
    body: "", contact_type: "phone" as ContactType, minutes: "", billable: true,
    service_type: "direct", charge_item_id: "", unit_price: "",
  });

  React.useEffect(() => {
    if (!open || !currentOrg) return;
    supabase.from("charge_items").select("*").eq("org_id", currentOrg.id).eq("active", true).order("code")
      .then(({ data }) => setItems((data as ChargeItem[]) ?? []));
  }, [open, currentOrg]);

  function pickItem(id: string) {
    const it = items.find((x) => x.id === id);
    setF((s) => ({ ...s, charge_item_id: id, unit_price: it?.unit_price != null ? String(it.unit_price) : s.unit_price, billable: id ? true : s.billable }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.body.trim()) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from("notes").insert({
      org_id: currentOrg.id, participant_id: participantId, body: f.body.trim(),
      contact_type: f.contact_type, minutes: f.minutes ? Number(f.minutes) : null,
      billable: f.billable, service_type: f.service_type, charge_item_id: f.charge_item_id || null,
      unit_price: f.unit_price ? Number(f.unit_price) : null, occurred_at: new Date().toISOString(),
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ body: "", contact_type: "phone", minutes: "", billable: true, service_type: "direct", charge_item_id: "", unit_price: "" });
    onSaved?.(); onClose();
  }

  const hours = f.minutes ? Number(f.minutes) / 60 : 0;
  const chargeTotal = hours * (Number(f.unit_price) || 0);

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Log note & charge"
      description={participantName ? `For ${participantName}` : undefined}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Case note" htmlFor="qb"><Textarea id="qb" rows={3} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="What happened, what was discussed, next steps…" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contact" htmlFor="qc">
            <Select id="qc" value={f.contact_type} onChange={(e) => setF({ ...f, contact_type: e.target.value as ContactType })}>
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
            </Select>
          </Field>
          <Field label="Minutes" htmlFor="qm"><Input id="qm" type="number" min="0" step="5" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
          <Field label="Service type" htmlFor="qs">
            <Select id="qs" value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })}>
              {SERVICE_TYPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="rounded-lg border border-line bg-canvas p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Charge item" htmlFor="qci" hint={items.length === 0 ? "Add items in Charge items first." : undefined}>
              <Select id="qci" value={f.charge_item_id} onChange={(e) => pickItem(e.target.value)}>
                <option value="">— none —</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.code}{it.name ? ` · ${it.name}` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Unit price ($/hr)" htmlFor="qup"><Input id="qup" type="number" min="0" step="0.01" value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} /></Field>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink">
              <input type="checkbox" checked={f.billable} onChange={(e) => setF({ ...f, billable: e.target.checked })} className="h-4 w-4 accent-brand-700" />
              Billable
            </label>
            {f.billable && hours > 0 && <span className="text-ink-500">Charge: <span className="font-semibold text-ink">{money(chargeTotal)}</span> ({hours.toFixed(2)}h)</span>}
          </div>
        </div>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save note</Button>
        </div>
      </form>
    </Dialog>
  );
}
