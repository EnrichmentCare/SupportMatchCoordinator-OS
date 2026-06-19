import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { AuthShell } from "./AuthShell";
import { Button, Field, Input } from "../components/ui";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is on, there's no session yet.
    if (data.session) navigate("/onboarding");
    else setNotice("Check your email to confirm your account, then log in.");
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold text-ink">Create your workspace</h2>
      <p className="mt-1 text-sm text-ink-500">Free for coordinators. No card required.</p>

      {!hasSupabaseConfig && (
        <p className="mt-4 rounded-md bg-status-amber/10 p-3 text-xs text-status-amber">
          App not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </p>
      )}

      {notice ? (
        <p className="mt-6 rounded-md bg-status-green/10 p-4 text-sm text-status-green">{notice}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Full name" htmlFor="name">
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Work email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <Input id="password" type="password" autoComplete="new-password" minLength={8} required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-status-red">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
