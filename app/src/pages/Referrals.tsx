import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Button, Field, Input } from "../components/ui";
import { Select, Textarea } from "../components/controls";
import { Dialog } from "../components/dialog";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { REFERRAL_BOARD, REFERRAL_STAGE_LABEL } from "../lib/labels";
import type { Referral, Participant, Provider } from "../types/database";

type Row = Referral & {
  participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null;
  providers: Pick<Provider, "name"> | null;
};

export default function Referrals() {
  const { currentOrg } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("referrals")
      .select("*, participants(first_name,last_name,preferred_name), providers(name)")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function move(r: Row, dir: -1 | 1) {
    const idx = REFERRAL_BOARD.indexOf(r.stage);
    const next = REFERRAL_BOARD[idx + dir];
    if (!next) return;
    const patch: Partial<Referral> = { stage: next };
    if (next === "sent" && !r.sent_at) patch.sent_at = new Date().toISOString();
    setRows((prev) => prev?.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) ?? null);
    await supabase.from("referrals").update(patch).eq("id", r.id);
  }

  const board = React.useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const s of REFERRAL_BOARD) map[s] = [];
    for (const r of rows ?? []) if (map[r.stage]) map[r.stage].push(r);
    return map;
  }, [rows]);

  const totalOnBoard = REFERRAL_BOARD.reduce((s, st) => s + (board[st]?.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Referrals</h1>
          <p className="text-sm text-ink-500">Track every referral from created through to commenced.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New referral</Button>
      </div>

      {loading ? <LoadingState label="Loading referrals…" />
        : error ? <ErrorState message={error} onRetry={load} />
        : totalOnBoard === 0 ? (
          <EmptyState icon={GitBranch} title="No referrals yet"
            description="Create a referral to a provider and move it across the board as it progresses."
            action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New referral</Button>} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {REFERRAL_BOARD.map((stage) => (
              <div key={stage} className="flex flex-col rounded-lg bg-brand-50/60 p-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-semibold text-ink">{REFERRAL_STAGE_LABEL[stage]}</span>
                  <span className="text-xs text-ink-500">{board[stage].length}</span>
                </div>
                <div className="space-y-2">
                  {board[stage].map((r) => {
                    const pName = r.participants
                      ? `${r.participants.preferred_name || r.participants.first_name} ${r.participants.last_name}`
                      : "Unknown";
                    const idx = REFERRAL_BOARD.indexOf(r.stage);
                    return (
                      <div key={r.id} className="rounded-md border border-line bg-surface p-3 shadow-card">
                        <Link to={`/participants/${r.participant_id}`} className="text-sm font-medium text-ink hover:text-brand-700">{pName}</Link>
                        <p className="mt-0.5 text-xs text-ink-500">{r.providers?.name || "No provider"}</p>
                        {r.service_type && <p className="text-xs text-ink-500">{r.service_type}</p>}
                        <div className="mt-2 flex items-center justify-between">
                          <button disabled={idx === 0} onClick={() => move(r, -1)}
                            className="rounded p-1 text-ink-500 hover:bg-brand-50 disabled:opacity-30" aria-label="Move back">
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button disabled={idx === REFERRAL_BOARD.length - 1} onClick={() => move(r, 1)}
                            className="rounded p-1 text-ink-500 hover:bg-brand-50 disabled:opacity-30" aria-label="Move forward">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      {creating && <CreateReferral onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function CreateReferral({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { currentOrg, session } = useAuth();
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [f, setF] = React.useState({ participant_id: "", provider_id: "", service_type: "", notes: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!currentOrg) return;
    (async () => {
      const [{ data: pp }, { data: pv }] = await Promise.all([
        supabase.from("participants").select("*").eq("org_id", currentOrg.id).order("first_name"),
        supabase.from("providers").select("*").eq("org_id", currentOrg.id).order("name"),
      ]);
      setParticipants((pp as Participant[]) ?? []);
      setProviders((pv as Provider[]) ?? []);
    })();
  }, [currentOrg]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !f.participant_id) return;
    setSaving(true); setError(null);
    const { error } = await supabase.from("referrals").insert({
      org_id: currentOrg.id, participant_id: f.participant_id,
      provider_id: f.provider_id || null, service_type: f.service_type || null,
      notes: f.notes || null, stage: "created", created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onCreated();
  }

  return (
    <Dialog open onClose={onClose} title="New referral" description="Refer a participant to a provider.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Participant" htmlFor="pt">
          <Select id="pt" required value={f.participant_id} onChange={(e) => setF({ ...f, participant_id: e.target.value })}>
            <option value="">Select participant…</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.preferred_name || p.first_name} {p.last_name}</option>)}
          </Select>
        </Field>
        <Field label="Provider" htmlFor="pv">
          <Select id="pv" value={f.provider_id} onChange={(e) => setF({ ...f, provider_id: e.target.value })}>
            <option value="">No provider yet</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Service type" htmlFor="svc"><Input id="svc" value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })} placeholder="e.g. Physiotherapy" /></Field>
        <Field label="Notes" htmlFor="nt"><Textarea id="nt" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" loading={saving}>Create referral</Button></div>
      </form>
    </Dialog>
  );
}
