import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Star, Phone, Mail, Globe, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Field, Input } from "../components/ui";
import { Select, Textarea } from "../components/controls";
import { Dialog } from "../components/dialog";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { CAPACITY_LABEL, CAPACITY_TONE, fmtDateTime } from "../lib/labels";
import type { Provider, ProviderContact, ProviderEngagement } from "../types/database";

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrg, session } = useAuth();
  const [p, setP] = React.useState<Provider | null>(null);
  const [contacts, setContacts] = React.useState<ProviderContact[]>([]);
  const [engagements, setEngagements] = React.useState<ProviderEngagement[]>([]);
  const [savedId, setSavedId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [addingContact, setAddingContact] = React.useState(false);
  const [addingEng, setAddingEng] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    const [{ data, error }, { data: c }, { data: e }, { data: sv }] = await Promise.all([
      supabase.from("providers").select("*").eq("id", id).maybeSingle(),
      supabase.from("provider_contacts").select("*").eq("provider_id", id).order("created_at"),
      supabase.from("provider_engagements").select("*").eq("provider_id", id).order("occurred_at", { ascending: false }),
      supabase.from("saved_providers").select("id").eq("provider_id", id).limit(1),
    ]);
    if (error) setError(error.message);
    else if (!data) setError("Provider not found.");
    else setP(data as Provider);
    setContacts((c as ProviderContact[]) ?? []);
    setEngagements((e as ProviderEngagement[]) ?? []);
    setSavedId(((sv as { id: string }[]) ?? [])[0]?.id ?? null);
    setLoading(false);
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  async function toggleSaved() {
    if (!currentOrg || !p) return;
    if (savedId) {
      await supabase.from("saved_providers").delete().eq("id", savedId);
      setSavedId(null);
    } else {
      const { data } = await supabase.from("saved_providers")
        .insert({ org_id: currentOrg.id, provider_id: p.id, user_id: session?.user.id ?? null, created_by: session?.user.id ?? null })
        .select("id").single();
      setSavedId((data as { id: string })?.id ?? null);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !p) return (
    <div className="mx-auto max-w-3xl">
      <ErrorState message={error ?? "Not found"} onRetry={load} />
      <div className="mt-4"><Link to="/providers" className="text-sm text-brand-700 hover:underline">← Back to providers</Link></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button onClick={() => navigate("/providers")} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Providers
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">{p.name}</h1>
            <Badge tone={CAPACITY_TONE[p.capacity_status]}>{CAPACITY_LABEL[p.capacity_status]}</Badge>
            {p.ndis_registered != null && <Badge tone={p.ndis_registered ? "green" : "neutral"}>{p.ndis_registered ? "NDIS registered" : "Unregistered"}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
            {p.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{p.phone}</span>}
            {p.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{p.email}</span>}
            {p.website && <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{p.website}</span>}
          </div>
        </div>
        <Button variant={savedId ? "accent" : "outline"} onClick={toggleSaved}>
          <Star className={`h-4 w-4 ${savedId ? "fill-white" : ""}`} /> {savedId ? "Preferred" : "Mark preferred"}
        </Button>
      </div>

      <Card><CardBody>
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Detail label="Services" value={p.services?.join(", ")} />
          <Detail label="Service areas" value={p.service_areas?.join(", ")} />
          <Detail label="ABN" value={p.abn} />
          {p.capacity_notes && <div className="col-span-2 sm:col-span-3"><Detail label="Capacity notes" value={p.capacity_notes} /></div>}
          {p.description && <div className="col-span-2 sm:col-span-3"><Detail label="Notes" value={p.description} /></div>}
        </dl>
      </CardBody></Card>

      {/* Contacts */}
      <Card>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-semibold text-ink">Contacts</h2>
          <Button size="sm" onClick={() => setAddingContact(true)}><Plus className="h-4 w-4" /> Add contact</Button>
        </div>
        <CardBody>
          {contacts.length === 0 ? (
            <EmptyState title="No contacts yet" description="Add the people you deal with at this provider." />
          ) : (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{c.name}</p>
                    {c.role && <span className="text-sm text-ink-500">· {c.role}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-500">
                    {c.phone && <span>{c.phone}</span>}{c.email && <span>{c.email}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Relationship management */}
      <Card>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-semibold text-ink">Relationship history</h2>
          <Button size="sm" variant="outline" onClick={() => setAddingEng(true)}><Plus className="h-4 w-4" /> Log interaction</Button>
        </div>
        <CardBody>
          {engagements.length === 0 ? (
            <EmptyState title="No interactions logged" description="Track referrals sent, capacity updates, calls and response times." />
          ) : (
            <ul className="space-y-2">
              {engagements.map((e) => (
                <li key={e.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{e.engagement_type || "Interaction"}</span>
                    <span className="text-xs text-ink-500">{fmtDateTime(e.occurred_at)}</span>
                  </div>
                  {e.summary && <p className="mt-1 text-sm text-ink-500">{e.summary}</p>}
                  {e.response_time_hours != null && <p className="mt-1 text-xs text-ink-500">Response time: {e.response_time_hours}h</p>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <ContactForm open={addingContact} onClose={() => setAddingContact(false)} providerId={p.id}
        orgId={currentOrg?.id} userId={session?.user.id} onSaved={() => { setAddingContact(false); load(); }} />
      <EngagementForm open={addingEng} onClose={() => setAddingEng(false)} providerId={p.id}
        orgId={currentOrg?.id} userId={session?.user.id} onSaved={() => { setAddingEng(false); load(); }} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function ContactForm({ open, onClose, providerId, orgId, userId, onSaved }: {
  open: boolean; onClose: () => void; providerId: string; orgId?: string; userId?: string; onSaved: () => void;
}) {
  const [f, setF] = React.useState({ name: "", role: "", phone: "", email: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !f.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("provider_contacts").insert({
      org_id: orgId, provider_id: providerId, name: f.name.trim(), role: f.role || null,
      phone: f.phone || null, email: f.email || null, created_by: userId ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ name: "", role: "", phone: "", email: "" }); onSaved();
  }
  return (
    <Dialog open={open} onClose={onClose} title="Add provider contact">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="n"><Input id="n" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Role" htmlFor="r"><Input id="r" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="p"><Input id="p" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email" htmlFor="e"><Input id="e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </div>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Add</Button></div>
      </form>
    </Dialog>
  );
}

function EngagementForm({ open, onClose, providerId, orgId, userId, onSaved }: {
  open: boolean; onClose: () => void; providerId: string; orgId?: string; userId?: string; onSaved: () => void;
}) {
  const [f, setF] = React.useState({ engagement_type: "call", summary: "", response_time_hours: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase.from("provider_engagements").insert({
      org_id: orgId, provider_id: providerId, engagement_type: f.engagement_type,
      summary: f.summary || null, response_time_hours: f.response_time_hours ? Number(f.response_time_hours) : null,
      created_by: userId ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setF({ engagement_type: "call", summary: "", response_time_hours: "" }); onSaved();
  }
  return (
    <Dialog open={open} onClose={onClose} title="Log interaction">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" htmlFor="et">
            <Select id="et" value={f.engagement_type} onChange={(e) => setF({ ...f, engagement_type: e.target.value })}>
              <option value="call">Call</option><option value="email">Email</option>
              <option value="referral_sent">Referral sent</option><option value="capacity_update">Capacity update</option>
              <option value="meeting">Meeting</option><option value="note">Note</option>
            </Select>
          </Field>
          <Field label="Response time (hours)" htmlFor="rt"><Input id="rt" type="number" min="0" value={f.response_time_hours} onChange={(e) => setF({ ...f, response_time_hours: e.target.value })} /></Field>
        </div>
        <Field label="Summary" htmlFor="s"><Textarea id="s" rows={2} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Log</Button></div>
      </form>
    </Dialog>
  );
}
