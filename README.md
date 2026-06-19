# Coordinator OS

A free daily operating system for NDIS Support Coordinators — manage a whole caseload
(participants, plans, funding, goals, referrals, providers, tasks, documents) from one
place. Commercially, it makes *"Request a Support Worker"* the most natural action in a
coordinator's day, feeding curated, consented leads to **Support Match**.

- **Frontend:** Vite + React + TypeScript + Tailwind (SPA) → Netlify
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions) — Sydney `ap-southeast-2`
- **Authz:** Row Level Security on every table; hard multi-tenant isolation
- **AI:** none in v1 (architecture is AI-ready — see `docs/`)

## Repo layout

```
app/                     Vite React SPA (the coordinator product + /admin lead console)
supabase/
  migrations/            0001 schema · 0002 functions/triggers/policies
  seed.sql               fictional demo data (seed_demo function)
  _apply_all.sql         0001 + 0002 concatenated for one-paste setup
docs/                    BUILD_PLAN, ERD, DESIGN_TOKENS, SETUP, (PRD/etc. to follow)
netlify config           app/netlify.toml
```

## 1. Apply the database (one time)

DB ports aren't open from every environment, so the reliable path is the Supabase
**SQL Editor**:

1. Supabase → your project → **SQL Editor → New query**.
2. Paste the contents of `supabase/_apply_all.sql` → **Run**.
3. (Demo data) Paste `supabase/seed.sql` → **Run**, then follow the comments at the
   top of that file to make yourself a Support Match admin and seed a demo org.

## 2. Run locally

```bash
cd app
cp .env.example .env.local      # fill in your project URL + anon key
npm install
npm run dev                     # http://localhost:5173
```

`.env.local`:
```
VITE_SUPABASE_URL=https://wkviryslxklnomrphxix.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

## 3. Deploy to Netlify

1. Push this repo to GitHub.
2. Netlify → **Add new site → Import from Git** → pick the repo.
3. Netlify reads `app/netlify.toml` (base `app`, build `npm run build`, publish `app/dist`).
4. **Site settings → Environment variables**: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
5. Deploy. The SPA redirect rule is already configured.

## Secrets

The **anon key** is safe in the browser (RLS protects data). The **service_role** and
**Resend** keys must never appear in this repo or the frontend — they belong only in
Supabase **Edge Function secrets** (used from Phase 3 onward).

## Type generation

Phase 0 uses an untyped Supabase client with explicit result casts. After migrations:

```bash
npx supabase gen types typescript --project-id wkviryslxklnomrphxix > app/src/types/database.ts
```

then re-add the `<Database>` generic in `app/src/lib/supabase.ts`.

## Status

Phase 0 (foundations) — auth, self-serve org onboarding, themed app shell, RAG caseload
dashboard, and the separate Support Match lead console. Phase 1 (the core
request-a-worker loop) is next.
