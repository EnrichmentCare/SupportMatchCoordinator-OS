import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Dialog } from "../dialog";
import { Button, Field } from "../ui";
import { Select, Textarea } from "../controls";
import { PLAN_MGMT_LABEL } from "../../lib/labels";
import { ShieldCheck } from "lucide-react";
import type { Participant } from "../../types/database";

// The shareable, minimum-necessary fields (what Support Match will see).
function ShareRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink">{value || "—"}</span>
    </div>
  );
}

export function RequestWorkerModal({
  participant,
  open,
  onClose,
  onSubmitted,
}: {
  participant: Participant;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { currentOrg, session } = useAuth();
  const [consented, setConsented] = React.useState(false);
  const [grantedBy, setGrantedBy] = React.useState(
    `${participant.preferred_name || participant.first_name} ${participant.last_name}`
  );
  const [method, setMethod] = React.useState("verbal");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (!currentOrg || !consented) return;
    setSaving(true);
    setError(null);

    // 1) Record the share-with-Support-Match consent
    const { data: consent, error: cErr } = await supabase
      .from("consents")
      .insert({
        org_id: currentOrg.id,
        participant_id: participant.id,
        type: "share_with_support_match",
        status: "granted",
        granted_by: grantedBy || null,
        method,
        created_by: session?.user.id ?? null,
      })
      .select("id")
      .single();
    if (cErr) { setSaving(false); setError(cErr.message); return; }

    // 2) Submit the request via the consent-enforcing RPC (snapshots participant fields)
    const { error: rErr } = await supabase.rpc("submit_support_worker_request", {
      p_participant_id: participant.id,
      p_consent_id: (consent as { id: string }).id,
      p_internal_notes: internalNotes || null,
    });
    setSaving(false);
    if (rErr) { setError(rErr.message); return; }
    onSubmitted();
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg"
      title="Request a Support Worker"
      description="Support Match will source, screen and shortlist matched workers — free.">
      <div className="space-y-5">
        <div className="rounded-lg border border-line bg-canvas p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            What will be shared with Support Match
          </p>
          <ShareRow label="Location" value={[participant.suburb, participant.state, participant.postcode].filter(Boolean).join(" ")} />
          <ShareRow label="Worker gender preference" value={participant.gender_preference?.replaceAll("_", " ")} />
          <ShareRow label="Interests" value={participant.interests?.join(", ")} />
          <ShareRow label="Languages" value={participant.languages?.join(", ")} />
          <ShareRow label="Hours / week" value={participant.hours_per_week?.toString()} />
          <ShareRow label="Funding type" value={participant.plan_management ? PLAN_MGMT_LABEL[participant.plan_management] : null} />
          <ShareRow label="Support needs" value={participant.support_needs_summary} />
          <p className="mt-2 text-xs text-ink-500">
            Name, NDIS number, medical history and notes are never shared. To change any detail,
            edit the participant's profile first.
          </p>
        </div>

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-700" />
            <span className="text-sm text-ink">
              <ShieldCheck className="mr-1 inline h-4 w-4 text-brand-700" />
              I confirm the participant (or their nominee) has consented to share these matching
              details with Support Match.
            </span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Consent given by" htmlFor="gb">
              <input id="gb" value={grantedBy} onChange={(e) => setGrantedBy(e.target.value)}
                className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink" />
            </Field>
            <Field label="Method" htmlFor="m">
              <Select id="m" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="verbal">Verbal</option>
                <option value="written">Written</option>
                <option value="portal">Portal</option>
              </Select>
            </Field>
          </div>
        </div>

        <Field label="Internal notes (not shared)" htmlFor="inotes">
          <Textarea id="inotes" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Anything your team should know — stays in Coordinator OS." />
        </Field>

        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="accent" loading={saving} disabled={!consented} onClick={submit}>
            Submit request
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
