import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Dialog } from "./dialog";
import { Button, Field, Input } from "./ui";
import { Select, Textarea, TagsInput } from "./controls";
import type { GenderPref, PlanManagement, RagStatus } from "../types/database";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

export function AddParticipantModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { currentOrg, session } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    preferred_name: "",
    phone: "",
    email: "",
    ndis_number: "",
    plan_management: "plan_managed" as PlanManagement,
    suburb: "",
    state: "NSW",
    postcode: "",
    gender_preference: "no_preference" as GenderPref,
    interests: [] as string[],
    languages: [] as string[],
    support_needs_summary: "",
    hours_per_week: "",
    rag_status: "green" as RagStatus,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("participants")
      .insert({
        org_id: currentOrg.id,
        first_name: form.first_name,
        last_name: form.last_name,
        preferred_name: form.preferred_name || null,
        phone: form.phone || null,
        email: form.email || null,
        ndis_number: form.ndis_number || null,
        plan_management: form.plan_management,
        suburb: form.suburb || null,
        state: form.state || null,
        postcode: form.postcode || null,
        gender_preference: form.gender_preference,
        interests: form.interests,
        languages: form.languages,
        support_needs_summary: form.support_needs_summary || null,
        hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
        rag_status: form.rag_status,
        assigned_coordinator: session?.user.id ?? null,
        created_by: session?.user.id ?? null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated((data as { id: string }).id);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add participant" size="lg"
      description="Capture the essentials. You can complete the full profile afterwards.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" htmlFor="fn">
            <Input id="fn" required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          </Field>
          <Field label="Last name" htmlFor="ln">
            <Input id="ln" required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preferred name" htmlFor="pn">
            <Input id="pn" value={form.preferred_name} onChange={(e) => set("preferred_name", e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="ph">
            <Input id="ph" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" htmlFor="em">
            <Input id="em" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="NDIS number" htmlFor="ndis">
            <Input id="ndis" value={form.ndis_number} onChange={(e) => set("ndis_number", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Suburb" htmlFor="sub">
            <Input id="sub" value={form.suburb} onChange={(e) => set("suburb", e.target.value)} />
          </Field>
          <Field label="State" htmlFor="st">
            <Select id="st" value={form.state} onChange={(e) => set("state", e.target.value)}>
              {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Postcode" htmlFor="pc">
            <Input id="pc" value={form.postcode} onChange={(e) => set("postcode", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan management" htmlFor="pm">
            <Select id="pm" value={form.plan_management}
              onChange={(e) => set("plan_management", e.target.value as PlanManagement)}>
              <option value="plan_managed">Plan managed</option>
              <option value="self_managed">Self managed</option>
              <option value="agency_managed">Agency managed</option>
            </Select>
          </Field>
          <Field label="Caseload status (RAG)" htmlFor="rag">
            <Select id="rag" value={form.rag_status}
              onChange={(e) => set("rag_status", e.target.value as RagStatus)}>
              <option value="green">On track</option>
              <option value="amber">Needs attention</option>
              <option value="red">Urgent</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Worker gender preference" htmlFor="gp">
            <Select id="gp" value={form.gender_preference}
              onChange={(e) => set("gender_preference", e.target.value as GenderPref)}>
              <option value="no_preference">No preference</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Hours / week" htmlFor="hpw">
            <Input id="hpw" type="number" min="0" step="0.5" value={form.hours_per_week}
              onChange={(e) => set("hours_per_week", e.target.value)} />
          </Field>
        </div>
        <Field label="Interests" htmlFor="int" hint="Used to pre-fill worker matching.">
          <TagsInput id="int" value={form.interests} onChange={(v) => set("interests", v)}
            placeholder="e.g. cooking, football, music" />
        </Field>
        <Field label="Languages" htmlFor="lang">
          <TagsInput id="lang" value={form.languages} onChange={(v) => set("languages", v)}
            placeholder="e.g. English, Greek" />
        </Field>
        <Field label="Support needs summary" htmlFor="needs">
          <Textarea id="needs" rows={3} value={form.support_needs_summary}
            onChange={(e) => set("support_needs_summary", e.target.value)}
            placeholder="What supports does this participant need?" />
        </Field>

        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create participant</Button>
        </div>
      </form>
    </Dialog>
  );
}
