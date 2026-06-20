import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button } from "../ui";
import { Select } from "../controls";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDate } from "../../lib/labels";
import { File, Upload, Download } from "lucide-react";
import type { DocumentRow } from "../../types/database";

const DOC_TYPES = ["report", "service_agreement", "consent", "assessment", "review", "plan", "correspondence", "other"];

export function DocumentsPanel({ participantId, onActivity }: { participantId: string; onActivity: () => void }) {
  const { currentOrg, session } = useAuth();
  const [rows, setRows] = React.useState<DocumentRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [docType, setDocType] = React.useState("report");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as DocumentRow[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;
    setUploading(true);
    setError(null);
    const path = `${currentOrg.id}/${participantId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { setUploading(false); setError(upErr.message); return; }
    const { error: insErr } = await supabase.from("documents").insert({
      org_id: currentOrg.id,
      participant_id: participantId,
      type: docType,
      title: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: session?.user.id ?? null,
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (insErr) { setError(insErr.message); return; }
    await load();
    onActivity();
  }

  async function download(doc: DocumentRow) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error) { setError(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Select className="w-44" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
        </Select>
        <input ref={fileRef} type="file" onChange={onFile} className="hidden" id="docfile" />
        <Button size="sm" variant="outline" loading={uploading}
          onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Upload document
        </Button>
      </div>

      {loading ? (
        <LoadingState label="Loading documents…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon={File} title="No documents yet" description="Upload reports, service agreements, assessments and reviews. Files are stored privately." />
      ) : (
        <ul className="space-y-2">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
              <div className="flex min-w-0 items-center gap-3">
                <File className="h-4 w-4 shrink-0 text-brand-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                  <p className="text-xs text-ink-500">{d.type.replaceAll("_", " ")} · {fmtDate(d.created_at)}</p>
                </div>
              </div>
              <button onClick={() => download(d)} className="flex items-center gap-1 text-sm text-brand-700 hover:underline">
                <Download className="h-4 w-4" /> Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
