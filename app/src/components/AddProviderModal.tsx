import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Dialog } from "./dialog";
import { Button, Field, Input } from "./ui";
import { Select, Textarea, TagsInput } from "./controls";
import type { ProviderCapacity } from "../types/database";

export function AddProviderModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { currentOrg, session } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [f, setF] = React.useState({
    name: "", services: [] as string[], service_areas: [] as string[],
    phone: "", email: "", website: "", abn: "",
    ndis_registered: "unknown", capacity_status: "unknown" as ProviderCapacity, description: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.name.trim()) return;
    setSaving(true); setError(null);
    const { data, error } = await supabase.from("providers").insert({
      org_id: currentOrg.id, name: f.name.trim(), services: f.services, service_areas: f.service_areas,
      phone: f.phone || null, email: f.email || null, website: f.website || null, abn: f.abn || null,
      ndis_registered: f.ndis_registered === "unknown" ? null : f.ndis_registered === "yes",
      capacity_status: f.capacity_status, description: f.description || null, created_by: session?.user.id ?? null,
    }).select("id").single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    onCreated((data as { id: string }).id);
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Add provider"
      description="Build your directory of providers, services and capacity.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Provider name" htmlFor="pn"><Input id="pn" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="ABN" htmlFor="abn"><Input id="abn" value={f.abn} onChange={(e) => setF({ ...f, abn: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="ph"><Input id="ph" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email" htmlFor="em"><Input id="em" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Website" htmlFor="web"><Input id="web" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
          <Field label="Capacity" htmlFor="cap">
            <Select id="cap" value={f.capacity_status} onChange={(e) => setF({ ...f, capacity_status: e.target.value as ProviderCapacity })}>
              <option value="open">Open</option><option value="limited">Limited</option><option value="closed">Closed</option><option value="unknown">Unknown</option>
            </Select>
          </Field>
        </div>
        <Field label="Services" htmlFor="svc"><TagsInput id="svc" value={f.services} onChange={(v) => setF({ ...f, services: v })} placeholder="e.g. SIL, Physio, OT, Cleaning" /></Field>
        <Field label="Service areas" htmlFor="sa"><TagsInput id="sa" value={f.service_areas} onChange={(v) => setF({ ...f, service_areas: v })} placeholder="e.g. Inner West, Sydney, NSW" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="NDIS registered?" htmlFor="reg">
            <Select id="reg" value={f.ndis_registered} onChange={(e) => setF({ ...f, ndis_registered: e.target.value })}>
              <option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes" htmlFor="desc"><Textarea id="desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add provider</Button>
        </div>
      </form>
    </Dialog>
  );
}
