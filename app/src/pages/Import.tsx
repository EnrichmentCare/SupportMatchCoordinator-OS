import * as React from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { Upload, Download, FileSpreadsheet, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Button } from "../components/ui";
import { Select } from "../components/controls";
import {
  ENTITIES, autoMap, coerce, buildParticipantMaps, resolveParticipant,
  type EntityDef, type ParticipantLite,
} from "../lib/importConfig";

type Step = "choose" | "map" | "done";

export default function Import() {
  const { currentOrg, session } = useAuth();
  const navigate = useNavigate();
  const [entity, setEntity] = React.useState<EntityDef>(ENTITIES[0]);
  const [step, setStep] = React.useState<Step>("choose");
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const hdrs = (res.meta.fields ?? []).filter(Boolean);
        if (hdrs.length === 0) { setError("Couldn't read any columns from that file."); return; }
        setHeaders(hdrs);
        setRows(res.data);
        setMapping(autoMap(entity, hdrs));
        setStep("map");
      },
      error: () => setError("Failed to parse the file."),
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    const header = entity.fields.map((f) => f.label).join(",");
    const blob = new Blob([header + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${entity.key}-import-template.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function buildRecords(): Promise<{ valid: Record<string, unknown>[]; errors: string[] }> {
    const errors: string[] = [];
    type Pending = { rec: Record<string, unknown>; ndis?: string; name?: string; rowNum: number };
    const pendings: Pending[] = [];

    rows.forEach((row, i) => {
      const rec: Record<string, unknown> = {};
      let ndis: string | undefined, name: string | undefined;
      for (const field of entity.fields) {
        const col = mapping[field.key];
        if (!col) continue;
        const val = coerce(field, row[col]);
        if (field.key === "__ndis") { if (typeof val === "string") ndis = val; continue; }
        if (field.key === "__name") { if (typeof val === "string") name = val; continue; }
        if (val !== null && val !== undefined) rec[field.key] = val;
      }
      const missing = entity.fields.filter((f) => f.required && !rec[f.key]).map((f) => f.label);
      if (missing.length) { errors.push(`Row ${i + 2}: missing ${missing.join(", ")}`); return; }
      pendings.push({ rec, ndis, name, rowNum: i + 2 });
    });

    // Parent entities — insert directly
    if (!entity.childOf) {
      const valid = pendings.map((p) => ({
        ...p.rec, org_id: currentOrg!.id, created_by: session?.user.id ?? null,
        ...(entity.key === "participants" ? { assigned_coordinator: session?.user.id ?? null } : {}),
      }));
      return { valid, errors };
    }

    // Child entities — resolve to a participant
    const { data: plist } = await supabase.from("participants")
      .select("id,ndis_number,first_name,last_name,preferred_name").eq("org_id", currentOrg!.id);
    const maps = buildParticipantMaps((plist as ParticipantLite[]) ?? []);

    const planByP = new Map<string, string>();
    if (entity.key === "funding") {
      const { data: plans } = await supabase.from("plans").select("id,participant_id,is_current")
        .eq("org_id", currentOrg!.id).order("is_current", { ascending: false });
      for (const pl of (plans as { id: string; participant_id: string }[]) ?? [])
        if (!planByP.has(pl.participant_id)) planByP.set(pl.participant_id, pl.id);
    }

    const resolved: { rec: Record<string, unknown>; pid: string; rowNum: number }[] = [];
    for (const p of pendings) {
      const pid = resolveParticipant(maps, p.ndis, p.name);
      if (!pid) { errors.push(`Row ${p.rowNum}: no matching participant (${p.ndis || p.name || "no identifier"})`); continue; }
      resolved.push({ rec: p.rec, pid, rowNum: p.rowNum });
    }

    // Funding needs a plan — create one for participants without a current plan
    if (entity.key === "funding") {
      const need = [...new Set(resolved.filter((r) => !planByP.has(r.pid)).map((r) => r.pid))];
      for (const pid of need) {
        const { data: np } = await supabase.from("plans")
          .insert({ org_id: currentOrg!.id, participant_id: pid, management_type: "plan_managed", is_current: true, created_by: session?.user.id ?? null })
          .select("id").single();
        if (np) planByP.set(pid, (np as { id: string }).id);
      }
    }

    const valid: Record<string, unknown>[] = [];
    for (const r of resolved) {
      const rec: Record<string, unknown> = { ...r.rec, org_id: currentOrg!.id, participant_id: r.pid, created_by: session?.user.id ?? null };
      if (entity.key === "funding") {
        const planId = planByP.get(r.pid);
        if (!planId) { errors.push(`Row ${r.rowNum}: couldn't attach a plan`); continue; }
        rec.plan_id = planId;
      }
      valid.push(rec);
    }
    return { valid, errors };
  }

  async function runImport() {
    if (!currentOrg) return;
    setImporting(true); setError(null);
    const { valid, errors } = await buildRecords();
    let created = 0;
    const allErrors = [...errors];
    for (let i = 0; i < valid.length; i += 200) {
      const batch = valid.slice(i, i + 200);
      const { error } = await supabase.from(entity.table).insert(batch);
      if (error) allErrors.push(`Batch ${i / 200 + 1}: ${error.message}`);
      else created += batch.length;
    }
    setImporting(false);
    setResult({ created, skipped: rows.length - created, errors: allErrors });
    setStep("done");
  }

  const preview = rows.slice(0, 5);
  const mappedFields = entity.fields.filter((f) => mapping[f.key]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Import data</h1>
        <p className="text-sm text-ink-500">Bring participants or providers in from a CSV exported from your old system.</p>
      </div>

      {error && <p className="rounded-md bg-status-red/10 p-3 text-sm text-status-red">{error}</p>}

      {step === "choose" && (
        <Card><CardBody className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">What are you importing?</label>
            <Select value={entity.key} onChange={(e) => setEntity(ENTITIES.find((x) => x.key === e.target.value)!)} className="max-w-xs">
              {ENTITIES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </Select>
          </div>
          <div className="rounded-lg border border-dashed border-line p-8 text-center">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-brand-500" />
            <p className="mt-2 text-sm text-ink-500">Upload a .csv file. We'll auto-match the columns for you.</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Choose CSV</Button>
              <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4" /> Download template</Button>
            </div>
          </div>
          <p className="text-xs text-ink-500">
            Tip: export to CSV from SupportAbility, ShiftCare, a spreadsheet, or any system — column names don't need
            to match exactly, you'll map them next.
          </p>
        </CardBody></Card>
      )}

      {step === "map" && (
        <>
          <Card>
            <div className="border-b border-line p-5"><h2 className="font-semibold text-ink">Map columns</h2><p className="text-sm text-ink-500">{rows.length} rows found. Adjust any mismatches.</p></div>
            <CardBody className="space-y-2">
              {entity.fields.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-44 text-sm text-ink">{f.label}{f.required && <span className="text-status-red"> *</span>}</div>
                  <ArrowRight className="h-4 w-4 text-ink-500/50" />
                  <Select value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })} className="max-w-xs">
                    <option value="">— skip —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <div className="border-b border-line p-5"><h2 className="font-semibold text-ink">Preview</h2></div>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-ink-500">
                  <tr>{mappedFields.map((f) => <th key={f.key} className="px-3 py-2 font-medium">{f.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {mappedFields.map((f) => {
                        const val = coerce(f, row[mapping[f.key]]);
                        return <td key={f.key} className="px-3 py-2 text-ink">{Array.isArray(val) ? val.join(", ") : (val as string) ?? "—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("choose")}>Back</Button>
            <Button loading={importing} onClick={runImport}>Import {rows.length} rows</Button>
          </div>
        </>
      )}

      {step === "done" && result && (
        <Card><CardBody className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-status-green" />
          <div>
            <p className="text-lg font-semibold text-ink">Imported {result.created} {entity.label.toLowerCase()}</p>
            {result.skipped > 0 && <p className="text-sm text-ink-500">{result.skipped} rows skipped</p>}
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg border border-status-amber/30 bg-status-amber/5 p-3 text-left">
              <p className="mb-1 text-sm font-medium text-status-amber">Some rows were skipped:</p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs text-ink-500">
                {result.errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => { setStep("choose"); setResult(null); setRows([]); }}>Import more</Button>
            <Button onClick={() => navigate(entity.key === "providers" ? "/providers" : "/participants")}>View {entity.label.toLowerCase()}</Button>
          </div>
        </CardBody></Card>
      )}
    </div>
  );
}
