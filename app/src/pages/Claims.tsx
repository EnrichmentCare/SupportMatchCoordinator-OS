import * as React from "react";
import Papa from "papaparse";
import { Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Button, Field, Input } from "../components/ui";
import { Select } from "../components/controls";
import { LoadingState, ErrorState, EmptyState } from "../components/states";
import { money, fmtDate, hoursFromMinutes } from "../lib/labels";

const SC_ITEMS = [
  { code: "07_001_0106_8_3", name: "Support Connection" },
  { code: "07_002_0106_8_3", name: "Coordination of Supports" },
  { code: "07_004_0132_8_3", name: "Specialist Support Coordination" },
];

type NoteRow = {
  id: string; minutes: number | null; occurred_at: string | null; created_at: string;
  participant_id: string | null;
  participants: { first_name: string; last_name: string; preferred_name: string | null; ndis_number: string | null } | null;
};

const SETTINGS_KEY = "cos_billing_settings";
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
}

function ddmmyyyy(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function Claims() {
  const { currentOrg } = useAuth();
  const saved = loadSettings();
  const [s, setS] = React.useState({
    registrationNumber: saved.registrationNumber ?? "",
    abn: saved.abn ?? "",
    supportItem: saved.supportItem ?? SC_ITEMS[1].code,
    unitPrice: saved.unitPrice ?? "",
    gstCode: saved.gstCode ?? "P2",
    authorisedBy: saved.authorisedBy ?? "",
  });
  const firstOfMonth = new Date(); firstOfMonth.setDate(1);
  const [from, setFrom] = React.useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = React.useState(new Date().toISOString().slice(0, 10));

  const [notes, setNotes] = React.useState<NoteRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState<number | null>(null);

  React.useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }, [s]);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null); setDone(null);
    const { data, error } = await supabase.from("notes")
      .select("id,minutes,occurred_at,created_at,participant_id,participants(first_name,last_name,preferred_name,ndis_number)")
      .eq("org_id", currentOrg.id).eq("billable", true).is("claimed_at", null)
      .gte("occurred_at", from).lte("occurred_at", to + "T23:59:59");
    if (error) setError(error.message);
    else setNotes((data as unknown as NoteRow[]) ?? []);
    setLoading(false);
  }, [currentOrg, from, to]);

  const claimable = (notes ?? []).filter((n) => (n.minutes ?? 0) > 0 && n.participants?.ndis_number);
  const excluded = (notes ?? []).length - claimable.length;
  const unit = Number(s.unitPrice) || 0;
  const totalHours = claimable.reduce((a, n) => a + (n.minutes ?? 0) / 60, 0);
  const totalValue = totalHours * unit;

  function lineFor(n: NoteRow) {
    const date = ddmmyyyy(n.occurred_at ?? n.created_at);
    const hours = ((n.minutes ?? 0) / 60).toFixed(2);
    return {
      RegistrationNumber: s.registrationNumber, NDISNumber: n.participants!.ndis_number,
      SupportsDeliveredFrom: date, SupportsDeliveredTo: date, SupportNumber: s.supportItem,
      ClaimReference: `SC-${n.id.slice(0, 8)}`, Quantity: "", Hours: hours, UnitPrice: unit.toFixed(2),
      GSTCode: s.gstCode, AuthorisedBy: s.authorisedBy, ParticipantApproved: "", InKindFundingProgram: "",
      ClaimType: "", CancellationReason: "", "ABN of Support Provider": s.abn,
    };
  }

  function exportCsv() {
    const fields = ["RegistrationNumber", "NDISNumber", "SupportsDeliveredFrom", "SupportsDeliveredTo", "SupportNumber",
      "ClaimReference", "Quantity", "Hours", "UnitPrice", "GSTCode", "AuthorisedBy", "ParticipantApproved",
      "InKindFundingProgram", "ClaimType", "CancellationReason", "ABN of Support Provider"];
    const csv = Papa.unparse({ fields, data: claimable.map(lineFor) });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ndis-bulk-claim-${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function markClaimed() {
    const now = new Date().toISOString();
    for (const n of claimable) {
      await supabase.from("notes").update({ claimed_at: now, claim_reference: `SC-${n.id.slice(0, 8)}` }).eq("id", n.id);
    }
    setDone(claimable.length);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">NDIS claims</h1>
        <p className="text-sm text-ink-500">Turn billable case notes into a bulk payment request file for the myplace portal.</p>
      </div>

      {/* Billing settings */}
      <Card>
        <div className="border-b border-line p-5"><h2 className="font-semibold text-ink">Your billing details</h2><p className="text-sm text-ink-500">Saved on this device.</p></div>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Registration number" htmlFor="reg"><Input id="reg" value={s.registrationNumber} onChange={(e) => setS({ ...s, registrationNumber: e.target.value })} /></Field>
            <Field label="ABN" htmlFor="abn"><Input id="abn" value={s.abn} onChange={(e) => setS({ ...s, abn: e.target.value })} /></Field>
            <Field label="Support item" htmlFor="item">
              <Select id="item" value={s.supportItem} onChange={(e) => setS({ ...s, supportItem: e.target.value })}>
                {SC_ITEMS.map((it) => <option key={it.code} value={it.code}>{it.code} — {it.name}</option>)}
              </Select>
            </Field>
            <Field label="Unit price ($/hr)" htmlFor="up" hint="From the current NDIS Price Guide for your state."><Input id="up" type="number" min="0" step="0.01" value={s.unitPrice} onChange={(e) => setS({ ...s, unitPrice: e.target.value })} /></Field>
            <Field label="GST code" htmlFor="gst">
              <Select id="gst" value={s.gstCode} onChange={(e) => setS({ ...s, gstCode: e.target.value })}>
                <option value="P2">P2 — GST free</option><option value="P1">P1 — GST applies</option><option value="">(blank)</option>
              </Select>
            </Field>
            <Field label="Authorised by" htmlFor="auth"><Input id="auth" value={s.authorisedBy} onChange={(e) => setS({ ...s, authorisedBy: e.target.value })} /></Field>
          </div>
        </CardBody>
      </Card>

      {/* Period */}
      <Card><CardBody>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From" htmlFor="from"><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To" htmlFor="to"><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Button onClick={load} loading={loading}>Find claimable notes</Button>
        </div>
      </CardBody></Card>

      {done != null && (
        <div className="flex items-center gap-2 rounded-lg border border-status-green/30 bg-status-green/5 p-3 text-sm text-status-green">
          <CheckCircle2 className="h-4 w-4" /> Marked {done} notes as claimed.
        </div>
      )}

      {error ? <ErrorState message={error} onRetry={load} />
        : loading ? <LoadingState />
        : notes == null ? null
        : claimable.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No claimable notes in this period"
            description="Billable case notes with minutes and a participant NDIS number will appear here." />
        ) : (
          <Card>
            <div className="flex items-center justify-between border-b border-line p-5">
              <div>
                <h2 className="font-semibold text-ink">{claimable.length} claimable lines</h2>
                <p className="text-sm text-ink-500">{hoursFromMinutes(Math.round(totalHours * 60))} · {money(totalValue)} at {money(unit)}/hr{excluded > 0 ? ` · ${excluded} skipped (no NDIS number)` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
                <Button onClick={markClaimed}>Mark claimed</Button>
              </div>
            </div>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-ink-500"><tr>
                  <th className="px-4 py-2 font-medium">Participant</th><th className="px-4 py-2 font-medium">NDIS</th>
                  <th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Hours</th><th className="px-4 py-2 font-medium text-right">Line $</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {claimable.map((n) => {
                    const hrs = (n.minutes ?? 0) / 60;
                    const pn = n.participants ? `${n.participants.preferred_name || n.participants.first_name} ${n.participants.last_name}` : "—";
                    return (
                      <tr key={n.id}>
                        <td className="px-4 py-2 text-ink">{pn}</td>
                        <td className="px-4 py-2 font-mono text-xs">{n.participants?.ndis_number}</td>
                        <td className="px-4 py-2">{fmtDate(n.occurred_at ?? n.created_at)}</td>
                        <td className="px-4 py-2">{hrs.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{money(hrs * unit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}

      <p className="text-xs text-ink-500">
        Tip: set the unit price from the current NDIS Price Guide for your state and registration group, then export and
        upload the CSV in the myplace provider portal's bulk payment request. "Mark claimed" stops notes being billed twice.
      </p>
    </div>
  );
}
