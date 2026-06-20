import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Select, Textarea } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { CONTACT_REL_LABEL, CONTACT_REL_OPTIONS } from "../../lib/labels";
import { UserCog, Phone, Mail, Plus } from "lucide-react";
import type { ContactRelationship, ParticipantContact } from "../../types/database";

export function ContactsPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<ParticipantContact[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("participant_contacts").select("*").eq("participant_id", participantId)
      .order("is_primary", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as ParticipantContact[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  const [f, setF] = React.useState({
    name: "", relationship: "plan_nominee" as ContactRelationship, phone: "", email: "", notes: "", is_primary: false,
  });
  const [saving, setSaving] = React.useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("participant_contacts").insert({
      org_id: currentOrg.id, participant_id: participantId, name: f.name.trim(),
      relationship: f.relationship, phone: f.phone || null, email: f.email || null,
      notes: f.notes || null, is_primary: f.is_primary, created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ name: "", relationship: "plan_nominee", phone: "", email: "", notes: "", is_primary: false });
    setAdding(false); await load(); onActivity();
  }

  async function remove(id: string) {
    await supabase.from("participant_contacts").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">Nominees, guardians, family, GP and emergency contacts.</p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add contact</Button>
      </div>

      {loading ? <LoadingState label="Loading contacts…" /> : error ? <ErrorState message={error} onRetry={load} />
        : !rows || rows.length === 0 ? (
          <EmptyState icon={UserCog} title="No contacts yet"
            description="Add the participant's nominee, guardian, family and key contacts."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add contact</Button>} />
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="flex items-start justify-between rounded-lg border border-line bg-surface p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{c.name}</p>
                    <Badge tone="brand">{CONTACT_REL_LABEL[c.relationship]}</Badge>
                    {c.is_primary && <Badge tone="green">Primary</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                  </div>
                  {c.notes && <p className="mt-1 text-sm text-ink-500">{c.notes}</p>}
                </div>
                <button onClick={() => remove(c.id)} className="text-xs text-ink-500 hover:text-status-red">Remove</button>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add contact">
        <form onSubmit={add} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" htmlFor="cn"><Input id="cn" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Relationship" htmlFor="cr">
              <Select id="cr" value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value as ContactRelationship })}>
                {CONTACT_REL_OPTIONS.map((r) => <option key={r} value={r}>{CONTACT_REL_LABEL[r]}</option>)}
              </Select>
            </Field>
            <Field label="Phone" htmlFor="cp"><Input id="cp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Email" htmlFor="ce"><Input id="ce" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          </div>
          <Field label="Notes" htmlFor="cnt"><Textarea id="cnt" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={f.is_primary} onChange={(e) => setF({ ...f, is_primary: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            Primary contact
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add contact</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
