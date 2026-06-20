import * as React from "react";
import { supabase } from "../lib/supabase";
import { Dialog } from "./dialog";
import { Button, Field, Input } from "./ui";
import { Select, Textarea, TagsInput } from "./controls";
import type { GenderPref, Participant, ParticipantStatus, PlanManagement, RagStatus } from "../types/database";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

export function EditParticipantModal({
  participant,
  open,
  onClose,
  onSaved,
}: {
  participant: Participant;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState<Participant>(participant);

  React.useEffect(() => { setF(participant); }, [participant]);

  function set<K extends keyof Participant>(k: K, v: Participant[K]) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("participants").update({
      first_name: f.first_name, last_name: f.last_name, preferred_name: f.preferred_name,
      pronouns: f.pronouns, date_of_birth: f.date_of_birth || null,
      phone: f.phone, email: f.email, ndis_number: f.ndis_number,
      plan_management: f.plan_management, status: f.status, rag_status: f.rag_status, rag_reason: f.rag_reason,
      address_line: f.address_line, suburb: f.suburb, state: f.state, postcode: f.postcode,
      gender_preference: f.gender_preference, interests: f.interests, languages: f.languages,
      cultural_background: f.cultural_background, support_needs_summary: f.support_needs_summary,
      hours_per_week: f.hours_per_week,
      // health
      primary_disability: f.primary_disability, secondary_disabilities: f.secondary_disabilities,
      communication_needs: f.communication_needs, mobility_needs: f.mobility_needs,
      dietary_needs: f.dietary_needs, allergies: f.allergies, medications_note: f.medications_note,
      mental_health_notes: f.mental_health_notes, interpreter_required: f.interpreter_required,
      interpreter_language: f.interpreter_language,
      check_in_frequency_days: f.check_in_frequency_days,
    }).eq("id", f.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Edit participant"
      description="Update identity, contact, preferences and health details.">
      <form onSubmit={save} className="space-y-5">
        <Section title="Identity & contact">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor="fn"><Input id="fn" required value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Last name" htmlFor="ln"><Input id="ln" required value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            <Field label="Preferred name" htmlFor="pn"><Input id="pn" value={f.preferred_name ?? ""} onChange={(e) => set("preferred_name", e.target.value)} /></Field>
            <Field label="Pronouns" htmlFor="pr"><Input id="pr" value={f.pronouns ?? ""} onChange={(e) => set("pronouns", e.target.value)} /></Field>
            <Field label="Date of birth" htmlFor="dob"><Input id="dob" type="date" value={f.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
            <Field label="NDIS number" htmlFor="nd"><Input id="nd" value={f.ndis_number ?? ""} onChange={(e) => set("ndis_number", e.target.value)} /></Field>
            <Field label="Phone" htmlFor="ph"><Input id="ph" value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email" htmlFor="em"><Input id="em" type="email" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2"><Field label="Address" htmlFor="ad"><Input id="ad" value={f.address_line ?? ""} onChange={(e) => set("address_line", e.target.value)} /></Field></div>
            <Field label="Suburb" htmlFor="su"><Input id="su" value={f.suburb ?? ""} onChange={(e) => set("suburb", e.target.value)} /></Field>
            <Field label="State" htmlFor="st">
              <Select id="st" value={f.state ?? "NSW"} onChange={(e) => set("state", e.target.value)}>
                {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="Status & preferences">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Status" htmlFor="status">
              <Select id="status" value={f.status} onChange={(e) => set("status", e.target.value as ParticipantStatus)}>
                <option value="participant">Participant</option><option value="active">Active</option>
                <option value="on_hold">On hold</option><option value="exited">Exited</option>
              </Select>
            </Field>
            <Field label="RAG status" htmlFor="rag">
              <Select id="rag" value={f.rag_status} onChange={(e) => set("rag_status", e.target.value as RagStatus)}>
                <option value="green">On track</option><option value="amber">Needs attention</option><option value="red">Urgent</option>
              </Select>
            </Field>
            <Field label="Plan management" htmlFor="pm">
              <Select id="pm" value={f.plan_management ?? "plan_managed"} onChange={(e) => set("plan_management", e.target.value as PlanManagement)}>
                <option value="plan_managed">Plan managed</option><option value="self_managed">Self managed</option><option value="agency_managed">Agency managed</option>
              </Select>
            </Field>
            <Field label="Worker gender pref." htmlFor="gp">
              <Select id="gp" value={f.gender_preference ?? "no_preference"} onChange={(e) => set("gender_preference", e.target.value as GenderPref)}>
                <option value="no_preference">No preference</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Hours / week" htmlFor="hpw"><Input id="hpw" type="number" min="0" step="0.5" value={f.hours_per_week ?? ""} onChange={(e) => set("hours_per_week", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="Cultural background" htmlFor="cb"><Input id="cb" value={f.cultural_background ?? ""} onChange={(e) => set("cultural_background", e.target.value)} /></Field>
            <Field label="Check-in every (days)" htmlFor="cif"><Input id="cif" type="number" min="0" value={f.check_in_frequency_days ?? ""} onChange={(e) => set("check_in_frequency_days", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          </div>
          <Field label="Interests" htmlFor="int"><TagsInput id="int" value={f.interests ?? []} onChange={(v) => set("interests", v)} /></Field>
          <Field label="Languages" htmlFor="lang"><TagsInput id="lang" value={f.languages ?? []} onChange={(v) => set("languages", v)} /></Field>
          <Field label="Support needs summary" htmlFor="needs"><Textarea id="needs" rows={2} value={f.support_needs_summary ?? ""} onChange={(e) => set("support_needs_summary", e.target.value)} /></Field>
          {f.rag_status !== "green" && (
            <Field label="RAG reason" htmlFor="rr"><Input id="rr" value={f.rag_reason ?? ""} onChange={(e) => set("rag_reason", e.target.value)} placeholder="Why amber/red?" /></Field>
          )}
        </Section>

        <Section title="Disability & health">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary disability" htmlFor="pd"><Input id="pd" value={f.primary_disability ?? ""} onChange={(e) => set("primary_disability", e.target.value)} /></Field>
            <Field label="Secondary disabilities" htmlFor="sd"><TagsInput id="sd" value={f.secondary_disabilities ?? []} onChange={(v) => set("secondary_disabilities", v)} /></Field>
            <Field label="Communication needs" htmlFor="cn"><Input id="cn" value={f.communication_needs ?? ""} onChange={(e) => set("communication_needs", e.target.value)} /></Field>
            <Field label="Mobility needs" htmlFor="mn"><Input id="mn" value={f.mobility_needs ?? ""} onChange={(e) => set("mobility_needs", e.target.value)} /></Field>
            <Field label="Dietary needs" htmlFor="dn"><Input id="dn" value={f.dietary_needs ?? ""} onChange={(e) => set("dietary_needs", e.target.value)} /></Field>
            <Field label="Allergies" htmlFor="al"><Input id="al" value={f.allergies ?? ""} onChange={(e) => set("allergies", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Interpreter required?" htmlFor="ir">
              <Select id="ir" value={f.interpreter_required ? "yes" : "no"} onChange={(e) => set("interpreter_required", e.target.value === "yes")}>
                <option value="no">No</option><option value="yes">Yes</option>
              </Select>
            </Field>
            <Field label="Interpreter language" htmlFor="il"><Input id="il" value={f.interpreter_language ?? ""} onChange={(e) => set("interpreter_language", e.target.value)} /></Field>
          </div>
          <Field label="Medications (note)" htmlFor="med"><Textarea id="med" rows={2} value={f.medications_note ?? ""} onChange={(e) => set("medications_note", e.target.value)} /></Field>
          <Field label="Mental health considerations" htmlFor="mh"><Textarea id="mh" rows={2} value={f.mental_health_notes ?? ""} onChange={(e) => set("mental_health_notes", e.target.value)} /></Field>
        </Section>

        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}
