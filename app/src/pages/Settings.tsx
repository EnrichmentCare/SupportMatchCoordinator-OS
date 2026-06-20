import * as React from "react";
import { Building, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { Card, CardBody, Badge, Button, Field, Input } from "../components/ui";
import { Select } from "../components/controls";
import { LoadingState, ErrorState } from "../components/states";
import { initials } from "../lib/utils";
import type { OrgRole } from "../types/database";

type Member = { id: string; user_id: string; role: OrgRole; is_active: boolean; profiles: { full_name: string | null; email: string | null } | null };

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", team_leader: "Team leader",
  specialist_support_coordinator: "Specialist SC", support_coordinator: "Support coordinator",
};
const ASSIGNABLE: OrgRole[] = ["admin", "team_leader", "specialist_support_coordinator", "support_coordinator"];

export default function Settings() {
  const { currentOrg, role, session, refresh } = useAuth();
  const isAdmin = role === "admin";
  const [members, setMembers] = React.useState<Member[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [org, setOrg] = React.useState({ name: "", abn: "", phone: "", email: "", suburb: "", state: "", postcode: "" });
  const [savingOrg, setSavingOrg] = React.useState(false);
  const [orgMsg, setOrgMsg] = React.useState<string | null>(null);

  const [invEmail, setInvEmail] = React.useState("");
  const [invRole, setInvRole] = React.useState<OrgRole>("support_coordinator");
  const [inviting, setInviting] = React.useState(false);
  const [invMsg, setInvMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true); setError(null);
    setOrg({
      name: currentOrg.name ?? "", abn: currentOrg.abn ?? "", phone: currentOrg.phone ?? "",
      email: currentOrg.email ?? "", suburb: currentOrg.suburb ?? "", state: currentOrg.state ?? "", postcode: currentOrg.postcode ?? "",
    });
    const { data, error } = await supabase.from("memberships")
      .select("id,user_id,role,is_active, profiles(full_name,email)").eq("org_id", currentOrg.id);
    if (error) setError(error.message);
    else setMembers((data as unknown as Member[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  React.useEffect(() => { load(); }, [load]);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    setSavingOrg(true); setOrgMsg(null);
    const { error } = await supabase.from("organisations").update({
      name: org.name, abn: org.abn || null, phone: org.phone || null, email: org.email || null,
      suburb: org.suburb || null, state: org.state || null, postcode: org.postcode || null,
    }).eq("id", currentOrg.id);
    setSavingOrg(false);
    if (error) { setOrgMsg(error.message); return; }
    setOrgMsg("Saved.");
    refresh();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrg || !invEmail.trim()) return;
    setInviting(true); setInvMsg(null);
    const { error } = await supabase.rpc("add_member_by_email", { p_org: currentOrg.id, p_email: invEmail.trim(), p_role: invRole });
    setInviting(false);
    if (error) { setInvMsg(error.message); return; }
    setInvEmail(""); setInvMsg("Added.");
    load();
  }

  async function changeRole(m: Member, r: OrgRole) {
    await supabase.from("memberships").update({ role: r }).eq("id", m.id);
    load();
  }
  async function toggleActive(m: Member) {
    await supabase.from("memberships").update({ is_active: !m.is_active }).eq("id", m.id);
    load();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>

      {/* Org details */}
      <Card>
        <div className="flex items-center gap-2 border-b border-line p-5">
          <Building className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-ink">Organisation</h2>
        </div>
        <CardBody>
          <form onSubmit={saveOrg} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" htmlFor="on"><Input id="on" value={org.name} disabled={!isAdmin} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></Field>
              <Field label="ABN" htmlFor="oa"><Input id="oa" value={org.abn} disabled={!isAdmin} onChange={(e) => setOrg({ ...org, abn: e.target.value })} /></Field>
              <Field label="Phone" htmlFor="op"><Input id="op" value={org.phone} disabled={!isAdmin} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></Field>
              <Field label="Email" htmlFor="oe"><Input id="oe" value={org.email} disabled={!isAdmin} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></Field>
              <Field label="Suburb" htmlFor="os"><Input id="os" value={org.suburb} disabled={!isAdmin} onChange={(e) => setOrg({ ...org, suburb: e.target.value })} /></Field>
              <Field label="State" htmlFor="ost"><Input id="ost" value={org.state} disabled={!isAdmin} onChange={(e) => setOrg({ ...org, state: e.target.value })} /></Field>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <Button type="submit" loading={savingOrg}>Save</Button>
                {orgMsg && <span className="text-sm text-ink-500">{orgMsg}</span>}
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Team */}
      <Card>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-semibold text-ink">Team</h2>
          <span className="text-sm text-ink-500">{members.filter((m) => m.is_active).length} active</span>
        </div>
        <CardBody className="space-y-4">
          {isAdmin && (
            <form onSubmit={invite} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-canvas p-3">
              <div className="min-w-[14rem] flex-1">
                <Field label="Add teammate by email" htmlFor="ie" hint="They must have signed up already.">
                  <Input id="ie" type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="name@example.com" />
                </Field>
              </div>
              <Select className="w-44" value={invRole} onChange={(e) => setInvRole(e.target.value as OrgRole)}>
                {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
              <Button type="submit" loading={inviting}><UserPlus className="h-4 w-4" /> Add</Button>
              {invMsg && <span className="w-full text-sm text-ink-500">{invMsg}</span>}
            </form>
          )}

          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initials(m.profiles?.full_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{m.profiles?.full_name ?? "—"}{m.user_id === session?.user.id ? " (you)" : ""}</p>
                    <p className="text-xs text-ink-500">{m.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!m.is_active && <Badge tone="neutral">Inactive</Badge>}
                  {isAdmin && m.user_id !== session?.user.id ? (
                    <>
                      <Select className="h-8 w-40 text-xs" value={m.role} onChange={(e) => changeRole(m, e.target.value as OrgRole)}>
                        {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </Select>
                      <button onClick={() => toggleActive(m)} className="text-xs text-ink-500 hover:text-status-red">{m.is_active ? "Deactivate" : "Reactivate"}</button>
                    </>
                  ) : (
                    <Badge tone="brand">{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
