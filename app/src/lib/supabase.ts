import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Fail loud in dev; the app shell surfaces a friendly config error too.
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local."
  );
}

// NOTE: untyped client for Phase 0. Query results are cast to the domain types
// in src/types/database.ts at each call site. After migrations are applied,
// regenerate the full typed schema with:
//   supabase gen types typescript --project-id wkviryslxklnomrphxix > src/types/database.ts
// then re-add the <Database> generic here for end-to-end type safety.
export const supabase = createClient(url ?? "", anon ?? "", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const hasSupabaseConfig = Boolean(url && anon);
