import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Search, Star } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Input } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { AddProviderModal } from "../components/AddProviderModal";
import { CAPACITY_LABEL, CAPACITY_TONE } from "../lib/labels";
import type { Provider, SavedProvider } from "../types/database";

export default function Providers() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<Provider[] | null>(null);
  const [saved, setSaved] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [onlySaved, setOnlySaved] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const [{ data, error }, { data: sv }] = await Promise.all([
      supabase.from("providers").select("*").eq("org_id", currentOrg.id).order("name"),
      supabase.from("saved_providers").select("provider_id").eq("org_id", currentOrg.id),
    ]);
    if (error) setError(error.message);
    else setRows((data as Provider[]) ?? []);
    setSaved(new Set(((sv as SavedProvider[]) ?? []).map((s) => s.provider_id)));
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    let r = rows ?? [];
    if (onlySaved) r = r.filter((p) => saved.has(p.id));
    const term = q.trim().toLowerCase();
    if (term) r = r.filter((p) =>
      `${p.name} ${(p.services ?? []).join(" ")} ${(p.service_areas ?? []).join(" ")}`.toLowerCase().includes(term));
    return r;
  }, [rows, q, onlySaved, saved]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Providers</h1>
          <p className="text-sm text-ink-500">Your directory of providers and their capacity.</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add provider</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <Input className="pl-9" placeholder="Search by name, service or area" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500">
          <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} className="h-4 w-4 accent-brand-700" />
          Preferred only
        </label>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? <LoadingState label="Loading providers…" />
            : error ? <div className="p-5"><ErrorState message={error} onRetry={load} /></div>
            : filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Building2} title={rows?.length ? "No matches" : "No providers yet"}
                  description={rows?.length ? "Try a different search or filter." : "Build your directory so you can refer participants quickly."}
                  action={!rows?.length ? <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add provider</Button> : undefined} />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => navigate(`/providers/${p.id}`)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-brand-50/50">
                      <div>
                        <div className="flex items-center gap-2">
                          {saved.has(p.id) && <Star className="h-4 w-4 fill-accent-400 text-accent-400" />}
                          <p className="font-medium text-ink">{p.name}</p>
                        </div>
                        <p className="text-xs text-ink-500">
                          {(p.services ?? []).slice(0, 3).join(", ") || "No services listed"}
                          {p.service_areas?.length ? ` · ${p.service_areas.slice(0, 2).join(", ")}` : ""}
                        </p>
                      </div>
                      <Badge tone={CAPACITY_TONE[p.capacity_status]}>{CAPACITY_LABEL[p.capacity_status]}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </CardBody>
      </Card>

      <AddProviderModal open={adding} onClose={() => setAdding(false)}
        onCreated={(id) => { setAdding(false); navigate(`/providers/${id}`); }} />
    </div>
  );
}
