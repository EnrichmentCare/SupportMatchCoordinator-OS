import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthProvider";
import { Button } from "../ui";
import { Textarea } from "../controls";
import { LoadingState, ErrorState, EmptyState } from "../states";
import { fmtDateTime } from "../../lib/labels";
import { FileText } from "lucide-react";
import type { Note } from "../../types/database";

export function NotesPanel({
  participantId,
  onActivity,
}: {
  participantId: string;
  onActivity: () => void;
}) {
  const { currentOrg, session } = useAuth();
  const [notes, setNotes] = React.useState<Note[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setNotes((data as Note[]) ?? []);
    setLoading(false);
  }, [participantId]);

  React.useEffect(() => { load(); }, [load]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !body.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("notes").insert({
      org_id: currentOrg.id,
      participant_id: participantId,
      body: body.trim(),
      created_by: session?.user.id ?? null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setBody("");
    await load();
    onActivity();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addNote} className="space-y-2">
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note about this participant…" />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={saving} disabled={!body.trim()}>Add note</Button>
        </div>
      </form>

      {loading ? (
        <LoadingState label="Loading notes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !notes || notes.length === 0 ? (
        <EmptyState icon={FileText} title="No notes yet" description="Notes you add appear here and on the timeline." />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-line bg-surface p-3">
              <p className="whitespace-pre-wrap text-sm text-ink">{n.body}</p>
              <p className="mt-1 text-xs text-ink-500">{fmtDateTime(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
