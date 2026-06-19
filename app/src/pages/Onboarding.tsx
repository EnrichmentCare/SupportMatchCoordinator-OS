import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";
import { AuthShell } from "./AuthShell";
import { Button, Field, Input } from "../components/ui";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [name, setName] = React.useState("");
  const [state, setState] = React.useState("NSW");
  const [abn, setAbn] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.rpc("create_organisation", {
      p_name: name,
      p_state: state,
      p_abn: abn || null,
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    await refresh();
    setLoading(false);
    navigate("/");
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold text-ink">Set up your organisation</h2>
      <p className="mt-1 text-sm text-ink-500">
        This is your coordination business. You'll be the admin and can invite your team.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Organisation name" htmlFor="org">
          <Input id="org" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Horizon Support Coordination" />
        </Field>
        <Field label="State" htmlFor="state">
          <select id="state" value={state} onChange={(e) => setState(e.target.value)}
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink">
            {AU_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="ABN" htmlFor="abn" hint="Optional.">
          <Input id="abn" value={abn} onChange={(e) => setAbn(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Create organisation
        </Button>
      </form>
    </AuthShell>
  );
}
