import * as React from "react";
import { Inbox } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { SupportMatchLead, SwrStatus } from "../../types/database";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";
import { SWR_FLOW, SWR_LABEL, fmtDate } from "../../lib/labels";

const ALL_STATUSES: SwrStatus[] = [...SWR_FLOW, "cancelled", "closed"];

export default function Leads() {
  const [leads, setLeads] = React.useState<SupportMatchLead[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("sm_list_leads");
    if (error) setError(error.message);
    else setLeads((data as SupportMatchLead[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function updateStatus(requestId: string, status: SwrStatus) {
    setSavingId(requestId);
    const { error } = await supabase.rpc("sm_update_lead_status", { p_request_id: requestId, p_status: status });
    setSavingId(null);
    if (error) { setError(error.message); return; }
    setLeads((prev) => prev?.map((l) => (l.request_id === requestId ? { ...l, status } : l)) ?? null);
  }

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incoming service provider requests</h1>
        <p className="text-sm text-white/60">
          Curated, consented matching details only. No participant identity or clinical data.
        </p>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {SWR_FLOW.map((s) => (
          <div key={s} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xl font-semibold">{counts[s] ?? 0}</p>
            <p className="mt-0.5 text-xs text-white/60">{SWR_LABEL[s]}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Loading leads…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (leads?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <EmptyState icon={Inbox} title="No leads yet"
            description="When a coordinator requests a service provider, the curated lead appears here." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Needs</th>
                <th className="px-4 py-3 font-medium">Hrs/wk</th>
                <th className="px-4 py-3 font-medium">Funding</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {leads!.map((l) => (
                <tr key={l.request_id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{l.reference}</td>
                  <td className="px-4 py-3">{[l.suburb, l.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-white/80">{l.support_needs_summary || "—"}</td>
                  <td className="px-4 py-3">{l.hours_per_week ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{l.funding_type?.replaceAll("_", " ") || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/70">{fmtDate(l.requested_at)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      disabled={savingId === l.request_id}
                      onChange={(e) => updateStatus(l.request_id, e.target.value as SwrStatus)}
                      className="rounded-md border border-white/20 bg-ink px-2 py-1 text-xs capitalize text-white"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{SWR_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
