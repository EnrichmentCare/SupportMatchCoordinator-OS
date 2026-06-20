import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthProvider";

type Result = { id: string; label: string; sub: string; to: string; kind: "participant" | "provider" };

export function GlobalSearch() {
  const { currentOrg } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Result[]>([]);
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!currentOrg || q.trim().length < 2) { setResults([]); return; }
    const term = q.trim();
    const handle = setTimeout(async () => {
      const like = `%${term}%`;
      const [pp, pv] = await Promise.all([
        supabase.from("participants").select("id,first_name,last_name,preferred_name,suburb")
          .eq("org_id", currentOrg.id)
          .or(`first_name.ilike.${like},last_name.ilike.${like},preferred_name.ilike.${like}`).limit(6),
        supabase.from("providers").select("id,name,services")
          .eq("org_id", currentOrg.id).ilike("name", like).limit(5),
      ]);
      const out: Result[] = [];
      for (const p of (pp.data as { id: string; first_name: string; last_name: string; preferred_name: string | null; suburb: string | null }[]) ?? [])
        out.push({ id: p.id, kind: "participant", label: `${p.preferred_name || p.first_name} ${p.last_name}`, sub: p.suburb || "Participant", to: `/participants/${p.id}` });
      for (const v of (pv.data as { id: string; name: string; services: string[] | null }[]) ?? [])
        out.push({ id: v.id, kind: "provider", label: v.name, sub: (v.services ?? []).slice(0, 2).join(", ") || "Provider", to: `/providers/${v.id}` });
      setResults(out);
      setOpen(true);
    }, 220);
    return () => clearTimeout(handle);
  }, [q, currentOrg]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(r: Result) { setOpen(false); setQ(""); navigate(r.to); }

  return (
    <div ref={boxRef} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search participants, providers…"
        className="h-9 w-56 rounded-md border border-line bg-canvas pl-8 pr-3 text-sm text-ink placeholder:text-ink-500/70 focus:w-72 focus:border-brand-500"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {results.map((r) => (
              <li key={r.kind + r.id}>
                <button onClick={() => go(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50/50">
                  {r.kind === "participant" ? <Users className="h-4 w-4 text-brand-600" /> : <Building2 className="h-4 w-4 text-brand-600" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{r.label}</p>
                    <p className="truncate text-xs text-ink-500">{r.sub}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
