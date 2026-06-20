import * as React from "react";
import { Link } from "react-router-dom";
import { File, Download, Search } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Input } from "../components/ui";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { fmtDate } from "../lib/labels";
import type { DocumentRow, Participant } from "../types/database";

type Row = DocumentRow & { participants: Pick<Participant, "first_name" | "last_name" | "preferred_name"> | null };

export default function DocumentsLibrary() {
  const { currentOrg } = useAuth();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("documents")
      .select("*, participants(first_name,last_name,preferred_name)")
      .eq("org_id", currentOrg.id).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function download(d: Row) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  const filtered = (rows ?? []).filter((d) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    const pn = d.participants ? `${d.participants.first_name} ${d.participants.last_name}` : "";
    return `${d.title} ${d.type} ${pn}`.toLowerCase().includes(term);
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Documents</h1>
        <p className="text-sm text-ink-500">Every document across your caseload.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <Input className="pl-9" placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} />
        : filtered.length === 0 ? (
          <EmptyState icon={File} title={rows?.length ? "No matches" : "No documents yet"} description="Upload documents from a participant's Documents tab." />
        ) : (
          <Card><CardBody className="p-0">
            <ul className="divide-y divide-line">
              {filtered.map((d) => {
                const pName = d.participants ? `${d.participants.preferred_name || d.participants.first_name} ${d.participants.last_name}` : null;
                return (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <File className="h-4 w-4 shrink-0 text-brand-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                        <p className="text-xs text-ink-500">
                          {d.type.replaceAll("_", " ")} · {fmtDate(d.created_at)}
                          {pName && d.participant_id && <> · <Link to={`/participants/${d.participant_id}`} className="text-brand-700 hover:underline">{pName}</Link></>}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => download(d)} className="flex items-center gap-1 text-sm text-brand-700 hover:underline"><Download className="h-4 w-4" /> Open</button>
                  </li>
                );
              })}
            </ul>
          </CardBody></Card>
        )}
    </div>
  );
}
