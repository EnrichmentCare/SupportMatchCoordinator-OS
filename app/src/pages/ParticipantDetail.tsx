import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, UserSearch, Pencil, FileText } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Card, CardBody, Badge, Button } from "../components/ui";
import { LoadingState, ErrorState } from "../components/states";
import { TimelineFeed } from "../components/panels/TimelineFeed";
import { NotesPanel } from "../components/panels/NotesPanel";
import { TasksPanel } from "../components/panels/TasksPanel";
import { DocumentsPanel } from "../components/panels/DocumentsPanel";
import { SupportMatchPanel } from "../components/panels/SupportMatchPanel";
import { RequestWorkerModal } from "../components/panels/RequestWorkerModal";
import { PlanPanel } from "../components/panels/PlanPanel";
import { ContactsPanel } from "../components/panels/ContactsPanel";
import { CareTeamPanel } from "../components/panels/CareTeamPanel";
import { FundingPanel } from "../components/panels/FundingPanel";
import { GoalsPanel } from "../components/panels/GoalsPanel";
import { RiskPanel } from "../components/panels/RiskPanel";
import { MeetingsPanel } from "../components/panels/MeetingsPanel";
import { COIPanel } from "../components/panels/COIPanel";
import { AgreementsPanel } from "../components/panels/AgreementsPanel";
import { EditParticipantModal } from "../components/EditParticipantModal";
import { KeyFacts } from "../components/KeyFacts";
import { cn, initials } from "../lib/utils";
import { RAG_LABEL, RAG_TONE, PLAN_MGMT_LABEL, PARTICIPANT_STATUS_LABEL, fmtDate } from "../lib/labels";
import type { Participant } from "../types/database";

type Tab =
  | "overview" | "plan" | "funding" | "goals" | "health" | "care_team" | "contacts"
  | "risk" | "coi" | "agreements" | "timeline" | "notes" | "tasks" | "meetings" | "documents" | "support_match";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "plan", label: "NDIS Plan" },
  { id: "funding", label: "Funding" },
  { id: "goals", label: "Goals" },
  { id: "health", label: "Health" },
  { id: "care_team", label: "Care team" },
  { id: "contacts", label: "Contacts" },
  { id: "risk", label: "Risk" },
  { id: "coi", label: "Conflicts" },
  { id: "agreements", label: "Agreements" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes" },
  { id: "tasks", label: "Tasks" },
  { id: "meetings", label: "Meetings" },
  { id: "documents", label: "Documents" },
  { id: "support_match", label: "Support Match" },
];

export default function ParticipantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [p, setP] = React.useState<Participant | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>("overview");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [requesting, setRequesting] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const bump = () => setRefreshKey((k) => k + 1);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("participants").select("*").eq("id", id).maybeSingle();
    if (error) setError(error.message);
    else if (!data) setError("Participant not found.");
    else setP(data as Participant);
    setLoading(false);
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (error || !p) return (
    <div className="mx-auto max-w-3xl">
      <ErrorState message={error ?? "Not found"} onRetry={load} />
      <div className="mt-4"><Link to="/participants" className="text-sm text-brand-700 hover:underline">← Back to participants</Link></div>
    </div>
  );

  const name = `${p.preferred_name || p.first_name} ${p.last_name}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button onClick={() => navigate("/participants")} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Participants
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
            {initials(name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{name}</h1>
              <Badge tone={RAG_TONE[p.rag_status]}>{RAG_LABEL[p.rag_status]}</Badge>
            </div>
            <p className="text-sm text-ink-500">
              {[p.suburb, p.state].filter(Boolean).join(", ") || "No location"} · {PARTICIPANT_STATUS_LABEL[p.status]}
              {p.plan_management ? ` · ${PLAN_MGMT_LABEL[p.plan_management]}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/participants/${p.id}/report`)}><FileText className="h-4 w-4" /> Report</Button>
          <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="accent" onClick={() => setRequesting(true)}>
            <UserSearch className="h-4 w-4" /> Request a Support Worker
          </Button>
        </div>
      </div>

      <KeyFacts participant={p} onParticipantChange={load} onActivity={bump} />

      <div className="border-b border-line">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium",
                tab === t.id ? "border-brand-700 text-brand-700" : "border-transparent text-ink-500 hover:text-ink"
              )}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <CardBody>
          {tab === "overview" && <Overview p={p} />}
          {tab === "plan" && <PlanPanel participantId={p.id} onActivity={bump} />}
          {tab === "funding" && <FundingPanel participantId={p.id} onActivity={bump} />}
          {tab === "goals" && <GoalsPanel participantId={p.id} onActivity={bump} />}
          {tab === "health" && <Health p={p} />}
          {tab === "care_team" && <CareTeamPanel participantId={p.id} onActivity={bump} />}
          {tab === "contacts" && <ContactsPanel participantId={p.id} onActivity={bump} />}
          {tab === "risk" && <RiskPanel participant={p} onParticipantChange={load} onActivity={bump} />}
          {tab === "coi" && <COIPanel participantId={p.id} onActivity={bump} />}
          {tab === "agreements" && <AgreementsPanel participant={p} onActivity={bump} />}
          {tab === "timeline" && <TimelineFeed participantId={p.id} refreshKey={refreshKey} />}
          {tab === "notes" && <NotesPanel participantId={p.id} onActivity={bump} />}
          {tab === "tasks" && <TasksPanel participantId={p.id} onActivity={bump} />}
          {tab === "meetings" && <MeetingsPanel participantId={p.id} onActivity={bump} />}
          {tab === "documents" && <DocumentsPanel participantId={p.id} onActivity={bump} />}
          {tab === "support_match" && <SupportMatchPanel participant={p} onActivity={bump} />}
        </CardBody>
      </Card>

      <RequestWorkerModal participant={p} open={requesting}
        onClose={() => setRequesting(false)}
        onSubmitted={() => { setRequesting(false); bump(); setTab("support_match"); }} />

      <EditParticipantModal participant={p} open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); load(); }} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value || "—"}</dd>
    </div>
  );
}

function Overview({ p }: { p: Participant }) {
  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      <Detail label="Full name" value={`${p.first_name} ${p.last_name}`} />
      <Detail label="Preferred name" value={p.preferred_name} />
      <Detail label="Pronouns" value={p.pronouns} />
      <Detail label="Date of birth" value={p.date_of_birth ? fmtDate(p.date_of_birth) : null} />
      <Detail label="Phone" value={p.phone} />
      <Detail label="Email" value={p.email} />
      <Detail label="NDIS number" value={p.ndis_number} />
      <Detail label="Plan management" value={p.plan_management ? PLAN_MGMT_LABEL[p.plan_management] : null} />
      <Detail label="Address" value={[p.address_line, p.suburb, p.state, p.postcode].filter(Boolean).join(", ")} />
      <Detail label="Worker gender preference" value={p.gender_preference?.replaceAll("_", " ")} />
      <Detail label="Hours / week" value={p.hours_per_week?.toString()} />
      <Detail label="Interests" value={p.interests?.join(", ")} />
      <Detail label="Languages" value={p.languages?.join(", ")} />
      <Detail label="Cultural background" value={p.cultural_background} />
      <div className="col-span-2 sm:col-span-3">
        <Detail label="Support needs summary" value={p.support_needs_summary} />
      </div>
      {p.rag_reason && (
        <div className="col-span-2 sm:col-span-3"><Detail label="RAG reason" value={p.rag_reason} /></div>
      )}
    </dl>
  );
}

function Health({ p }: { p: Participant }) {
  const interpreter = p.interpreter_required
    ? `Yes${p.interpreter_language ? ` — ${p.interpreter_language}` : ""}`
    : "No";
  return (
    <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      <Detail label="Primary disability" value={p.primary_disability} />
      <Detail label="Secondary disabilities" value={p.secondary_disabilities?.join(", ")} />
      <Detail label="Interpreter" value={interpreter} />
      <Detail label="Communication needs" value={p.communication_needs} />
      <Detail label="Mobility needs" value={p.mobility_needs} />
      <Detail label="Dietary needs" value={p.dietary_needs} />
      <Detail label="Allergies" value={p.allergies} />
      <div className="col-span-2 sm:col-span-3"><Detail label="Medications" value={p.medications_note} /></div>
      <div className="col-span-2 sm:col-span-3"><Detail label="Mental health considerations" value={p.mental_health_notes} /></div>
    </dl>
  );
}
