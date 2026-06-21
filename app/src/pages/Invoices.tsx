import * as React from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Button, Field } from "../components/ui";
import { Select } from "../components/controls";
import { Input } from "../components/ui";
import type { Participant } from "../types/database";

export default function Invoices() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const firstOfMonth = new Date(); firstOfMonth.setDate(1);
  const [pid, setPid] = React.useState("");
  const [from, setFrom] = React.useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = React.useState(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    if (!currentOrg) return;
    supabase.from("participants").select("*").eq("org_id", currentOrg.id).order("first_name")
      .then(({ data }) => setParticipants((data as Participant[]) ?? []));
  }, [currentOrg]);

  function generate() {
    if (!pid) return;
    navigate(`/invoice/${pid}?from=${from}&to=${to}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
        <p className="text-sm text-ink-500">Generate an invoice from a participant's billable case notes.</p>
      </div>

      <Card><CardBody className="space-y-4">
        <Field label="Participant" htmlFor="ip">
          <Select id="ip" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Select participant…</option>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.preferred_name || p.first_name} {p.last_name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From" htmlFor="if"><Input id="if" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To" htmlFor="it"><Input id="it" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={generate} disabled={!pid}><FileText className="h-4 w-4" /> Generate invoice</Button>
        </div>
        <p className="text-xs text-ink-500">Uses your billing details (ABN, registration number) saved in NDIS claims.</p>
      </CardBody></Card>
    </div>
  );
}
