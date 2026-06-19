import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Membership, Organisation, Profile } from "../types/database";

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  memberships: (Membership & { organisations: Organisation })[];
  currentOrg: Organisation | null;
  role: Membership["role"] | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [memberships, setMemberships] = React.useState<Ctx["memberships"]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async (uid: string) => {
    const [{ data: prof }, { data: mems }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("memberships")
        .select("*, organisations(*)")
        .eq("user_id", uid)
        .eq("is_active", true),
    ]);
    setProfile((prof as Profile) ?? null);
    setMemberships((mems as Ctx["memberships"]) ?? []);
  }, []);

  const refresh = React.useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) await loadProfile(data.session.user.id);
  }, [loadProfile]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else {
        setProfile(null);
        setMemberships([]);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const currentOrg = memberships[0]?.organisations ?? null;
  const role = memberships[0]?.role ?? null;

  return (
    <AuthContext.Provider
      value={{ session, profile, memberships, currentOrg, role, loading, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
