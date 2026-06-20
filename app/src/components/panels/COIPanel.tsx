import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button, Field, Input, Badge } from "../ui";
import { Select, Textarea } from "../controls";
import { Dialog } from "../dialog";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDate } from "../../lib/labels";
import { Scale, Plus } from "lucide-react";
import type { ParticipantCOI } from "../../types/database";

const STATUS_TONE: Record<string, "green" | "amber" | "neutral"> = { active: "amber", managed: "green", closed: "neutral" };

export function COIPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<ParticipantCOI[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [f, setF] = React.useState({
    nature: "", related_party: "", disclosed: true, disclosure_method: "verbal",
    options_offered: "", participant_choice: "", status: "managed", notes: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("participant_coi").select("*")
      .eq("participant_id", participantId).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as ParticipantCOI[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.nature.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("participant_coi").insert({
      org_id: currentOrg.id, participant_id: participantId, nature: f.nature.trim(),
      related_party: f.related_party || null, disclosed: f.disclosed,
      disclosed_at: f.disclosed ? new Date().toISOString() : null, disclosure_method: f.disclosure_method,
      options_offered: f.options_offered || null, participant_choice: f.participant_choice || null,
      status: f.status, notes: f.notes || null, created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ nature: "", related_party: "", disclosed: true, disclosure_method: "verbal", options_offered: "", participant_choice: "", status: "managed", notes: "" });
    setAdding(false); await load(); onActivity();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-ink-500">
          Record any real or perceived conflicts — e.g. referring to a related provider — with how it was
          disclosed and what the participant chose. Required by the NDIS Code of Conduct.
        </p>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Declare</Button>
      </div>

      {loading ? <LoadingState label="Loading…" /> : error ? <ErrorState message={error} onRetry={load} />
        : !rows || rows.length === 0 ? (
          <EmptyState icon={Scale} title="No conflicts recorded"
            description="If you refer this participant to a provider you're connected to, declare and manage it here."
            action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Declare a conflict</Button>} />
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{c.nature}</p>
                    {c.related_party && <Badge tone="brand">{c.related_party}</Badge>}
                  </div>
                  <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge>
                </div>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <Field2 label="Disclosed" value={c.disclosed ? `Yes${c.disclosure_method ? ` (${c.disclosure_method})` : ""} · ${fmtDate(c.disclosed_at)}` : "No"} />
                  {c.options_offered && <Field2 label="Options offered" value={c.options_offered} />}
                  {c.participant_choice && <Field2 label="Participant's choice" value={c.participant_choice} />}
                  {c.notes && <Field2 label="Notes" value={c.notes} />}
                </div>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={adding} onClose={() => setAdding(false)} size="lg" title="Declare a conflict of interest">
        <form onSubmit={add} className="space-y-4">
          <Field label="Nature of the conflict" htmlFor="cn"><Input id="cn" required value={f.nature} onChange={(e) => setF({ ...f, nature: e.target.value })} placeholder="e.g. Referral to a provider our organisation is connected to" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Related party" htmlFor="rp"><Input id="rp" value={f.related_party} onChange={(e) => setF({ ...f, related_party: e.target.value })} placeholder="e.g. Support Match / Enrichment Care" /></Field>
            <Field label="Status" htmlFor="st">
              <Select id="st" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                <option value="managed">Managed</option><option value="active">Active</option><option value="closed">Closed</option>
              </Select>
            </Field>
            <Field label="Disclosed to participant?" htmlFor="dc">
              <Select id="dc" value={f.disclosed ? "yes" : "no"} onChange={(e) => setF({ ...f, disclosed: e.target.value === "yes" })}>
                <option value="yes">Yes</option><option value="no">Not yet</option>
              </Select>
            </Field>
            <Field label="Disclosure method" htmlFor="dm">
              <Select id="dm" value={f.disclosure_method} onChange={(e) => setF({ ...f, disclosure_method: e.target.value })}>
                <option value="verbal">Verbal</option><option value="written">Written</option><option value="portal">Portal</option>
              </Select>
            </Field>
          </div>
          <Field label="Options offered" htmlFor="oo"><Textarea id="oo" rows={2} value={f.options_offered} onChange={(e) => setF({ ...f, options_offered: e.target.value })} placeholder="What alternatives did you present?" /></Field>
          <Field label="Participant's choice" htmlFor="pc"><Textarea id="pc" rows={2} value={f.participant_choice} onChange={(e) => setF({ ...f, participant_choice: e.target.value })} placeholder="What did they choose, and why?" /></Field>
          <Field label="Notes" htmlFor="nt"><Textarea id="nt" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function Field2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-ink-500">{label}: </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
