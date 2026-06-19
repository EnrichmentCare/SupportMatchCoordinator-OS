import * as React from "react";
import { Inbox } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { SupportMatchLead } from "../../types/database";
import { LoadingState, ErrorState, EmptyState } from "../../components/states";

const STATUS_FLOW = [
  "requested", "received", "matching", "worker_proposed", "placed", "active",
] as const;

export default function Leads() {
  const [leads, setLeads] = React.useState<SupportMatchLead[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    // The ONLY path to lead data — curated columns, no clinical fields.
    const { data, error } = await supabase.rpc("sm_list_leads");
    if (error) setError(error.message);
    else setLeads((data as SupportMatchLead[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incoming support worker requests</h1>
        <p className="text-sm text-white/60">
          Curated, consented matching details only. No participant identity or clinical data.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading leads…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (leads?.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <EmptyState
            icon={Inbox}
            title="No leads yet"
            description="When a coordinator requests a support worker, the curated lead appears here."
          />
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
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-accent-500/20 px-2.5 py-0.5 text-xs capitalize text-accent-400">
                      {l.status.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-white/40">
        Funnel: {STATUS_FLOW.join(" → ")}
      </p>
    </div>
  );
}
