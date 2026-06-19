import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { AuthShell } from "./AuthShell";
import { Button, Field, Input } from "../components/ui";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate("/");
  }

  return (
    <AuthShell>
      <h2 className="text-2xl font-semibold text-ink">Welcome back</h2>
      <p className="mt-1 text-sm text-ink-500">Log in to your coordinator workspace.</p>

      {!hasSupabaseConfig && (
        <p className="mt-4 rounded-md bg-status-amber/10 p-3 text-xs text-status-amber">
          App not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-status-red">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New here?{" "}
        <Link to="/signup" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
