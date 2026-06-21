import * as React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { LoadingState, ErrorState } from "../components/states";
import { money, fmtDate, SERVICE_TYPE_LABEL, CONTACT_TYPE_LABEL } from "../lib/labels";
import type { Participant, Note } from "../types/database";

function billing() {
  try { return JSON.parse(localStorage.getItem("cos_billing_settings") || "{}"); } catch { return {}; }
}

export default function InvoiceDocument() {
  const { participantId } = useParams<{ participantId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currentOrg } = useAuth();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const [p, setP] = React.useState<Participant | null>(null);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!participantId) return;
    setLoading(true); setError(null);
    const [{ data: pp }, { data: nn, error }] = await Promise.all([
      supabase.from("participants").select("*").eq("id", participantId).maybeSingle(),
      supabase.from("notes").select("*").eq("participant_id", participantId).eq("billable", true)
        .gte("occurred_at", from).lte("occurred_at", to + "T23:59:59").order("occurred_at"),
    ]);
    if (error || !pp) { setError(error?.message ?? "Not found"); setLoading(false); return; }
    setP(pp as Participant);
    setNotes((nn as Note[]) ?? []);
    setLoading(false);
  }, [participantId, from, to]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-10"><LoadingState /></div>;
  if (error || !p) return <div className="p-10"><ErrorState message={error ?? "Error"} onRetry={load} /></div>;

  const b = billing();
  const lines = notes.map((n) => {
    const hours = (n.minutes ?? 0) / 60;
    const rate = n.unit_price ?? 0;
    return { n, hours, rate, amount: hours * rate };
  });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const invNo = `INV-${(from || "").replaceAll("-", "").slice(0, 6)}-${participantId!.slice(0, 4).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-white">
      <style>{`@media print { .no-print { display:none !important; } }`}</style>
      <div className="no-print sticky top-0 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <button onClick={() => navigate(`/participants/${participantId}`)} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10 text-ink">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tax Invoice</h1>
            <p className="text-sm text-ink-500">{invNo}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-ink">{currentOrg?.name}</p>
            {b.abn && <p className="text-ink-500">ABN {b.abn}</p>}
            {b.registrationNumber && <p className="text-ink-500">Reg {b.registrationNumber}</p>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">Bill to</p>
            <p className="font-medium">{p.first_name} {p.last_name}</p>
            {p.ndis_number && <p className="text-ink-500">NDIS {p.ndis_number}</p>}
            {[p.address_line, p.suburb, p.state, p.postcode].filter(Boolean).length > 0 && (
              <p className="text-ink-500">{[p.address_line, p.suburb, p.state, p.postcode].filter(Boolean).join(", ")}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-500">Period</p>
            <p>{fmtDate(from)} – {fmtDate(to)}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">Issued</p>
            <p>{fmtDate(new Date().toISOString())}</p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-b border-ink text-left">
            <th className="py-2">Date</th><th>Description</th><th className="text-right">Hours</th><th className="text-right">Rate</th><th className="text-right">Amount</th>
          </tr></thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={5} className="py-4 text-center text-ink-500">No billable notes in this period.</td></tr>
            ) : lines.map((l) => (
              <tr key={l.n.id} className="border-b border-line">
                <td className="py-2">{fmtDate(l.n.occurred_at ?? l.n.created_at)}</td>
                <td className="py-2">
                  {l.n.service_type ? SERVICE_TYPE_LABEL[l.n.service_type] : "Support coordination"}
                  {l.n.contact_type ? ` · ${CONTACT_TYPE_LABEL[l.n.contact_type]}` : ""}
                </td>
                <td className="py-2 text-right">{l.hours.toFixed(2)}</td>
                <td className="py-2 text-right">{money(l.rate)}</td>
                <td className="py-2 text-right">{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={4} className="py-2 text-right font-medium">Subtotal</td><td className="py-2 text-right">{money(total)}</td></tr>
            <tr><td colSpan={4} className="py-1 text-right text-ink-500">GST (NDIS supports GST-free)</td><td className="py-1 text-right text-ink-500">{money(0)}</td></tr>
            <tr><td colSpan={4} className="py-2 text-right text-lg font-semibold">Total</td><td className="py-2 text-right text-lg font-semibold">{money(total)}</td></tr>
          </tfoot>
        </table>

        <p className="mt-10 text-xs text-ink-500">Generated by Coordinator OS. Please remit payment per your service agreement.</p>
      </div>
    </div>
  );
}
