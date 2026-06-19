# Coordinator OS — Build Plan (for approval)

**Product:** A free daily operating system for NDIS Support Coordinators. Commercially,
its purpose is to make *"Request a Support Worker"* the most natural action in a
coordinator's day — feeding curated leads to Support Match.

**Working name:** *Coordinator OS* (the folder name) — confirm or rename.

---

## Stack (as briefed)

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui → static SPA on Netlify.
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime), **Sydney `ap-southeast-2`**.
- **Email:** Resend, called only from an Edge Function. Keys in Supabase secrets.
- **Authz:** Row Level Security on every table. Typed client via `supabase gen types`.

I agree with the Vite SPA recommendation over Next.js — this is a behind-login dashboard, RLS does the authorisation, and SPA deploys to Netlify with zero SSR friction.

---

## Phase breakdown

| Phase | Scope | Deploy gate |
|---|---|---|
| **0 — Foundations** | Repo, Supabase (Sydney), migrations, RLS, Auth, org/membership multi-tenancy, app shell + nav, design system, seed data, Netlify pipeline. | Sign up → create/join org → log in → empty themed dashboard live. RLS proven: org B cannot see org A's data. |
| **1 — MVP vertical slice ⭐** | Participant CRM, Caseload Dashboard (RAG), Participant Timeline, Tasks, Notes, basic Document upload, **Support Worker Request → consent → curated lead → status tracking**, internal funnel metrics, Support Match curated inbox. | The full core loop works end-to-end, live. SM Admin sees leads with **zero** clinical data. |
| **2 — Coordinator daily depth** | Referral Kanban (+ history & reporting), Provider Directory + saved/preferred + PRM, Funding Tracker (Core/CB/Capital + alerts), Goals linked to activity. | Coordinator runs referrals on a board, saves providers, tracks funding with alerts, ties goals to evidence — all on the timeline. |
| **3 — Platform completeness** | Notifications (in-app + email), non-AI Automation engine, Meetings, Reporting dashboards, email-to-record, Support Worker DB (matching-ready), admin hardening, portals (participant/nominee/provider/worker). | Full caseload runs; automations fire; reporting reflects real activity. |
| **Future — AI-ready** | *Architecture only, build nothing.* Edge Functions as the home for model calls; clean normalised data; `ai_outputs` stub table. | — |

### Confirmed decisions (19 Jun 2026)
1. **Supabase/Netlify owned by Sam** — I provide exact setup steps + env vars (see `docs/SETUP.md`).
2. **Self-serve sign-up** — signing up creates a new organisation with that user as **Admin**; they invite teammates. Phase 0 builds the sign-up → create-org flow.
3. **Separate admin surface for Support Match** — the lead inbox is an isolated `/admin` app surface gated by the platform `is_support_match_admin` flag, fully separated from the coordinator UI.
4. **Timeline via Postgres triggers** — `timeline_events` is written by DB triggers (migration 0002), guaranteeing a reliable single source of truth from any write path.

### Sequencing notes / changes I'd propose
1. **Deploy in Phase 0, not later.** Prove the Netlify + Supabase pipeline with a "hello, authenticated" build before any features — de-risks the whole project.
2. **Timeline writes via Postgres triggers**, not app code. Makes the participant timeline a reliable single source of truth even if a write comes from an Edge Function or future automation. (Open question Q5.)
3. **Support Match access via RPC, not a table policy.** SM Admin gets `sm_list_leads()` / `sm_update_lead_status()` security-definer functions instead of a broad RLS grant — structurally impossible to leak clinical data. (In migration 0002.)
4. **Consent is enforced at the database**, not just the UI: `support_worker_requests.consent_id` is `NOT NULL` and a valid `share_with_support_match` consent is checked before submit.

---

## Permissions matrix (baseline — enforced in RLS)

| Entity | Admin | Team Leader | Spec. SC / SC | Participant* | Nominee* | Provider* | Worker* | SM Admin |
|---|---|---|---|---|---|---|---|---|
| Org settings, users | CRUD | R | – | – | – | – | – | – |
| Participants (clinical) | CRUD | CRUD | CRUD (assigned/shared) | R own | R shared | – | – | **never** |
| Referrals / Providers / PRM | CRUD | CRUD | CRUD | – | – | R own | – | – |
| Funding / Plans / Goals | CRUD | CRUD | CRUD | R own | R shared | – | – | – |
| Support Worker Request | CRUD | CRUD | CRUD | R own | R shared | – | – | – |
| **Curated lead (view)** | – | – | – | – | – | – | – | **R + status update** |
| Support Worker profile | CRUD | CRUD | R | – | – | – | R/U own | CRUD (pool) |
| Audit log | R | – | – | – | – | – | – | – |

\* Portal roles ship in Phase 3. Baseline migration 0001 grants org-members full CRUD on org-scoped tables and proves tenant isolation; finer per-role gating (assigned/shared participant visibility, portal read-only) is layered in migration 0002 + the app.

---

## Deliverables tracker (Section 12)

| Doc | Status |
|---|---|
| `/supabase/migrations/0001_initial_schema.sql` | ✅ drafted (this response) |
| `/docs/ERD.md` (Mermaid) | ✅ drafted |
| `/docs/BUILD_PLAN.md` | ✅ this file |
| `/docs/DESIGN_TOKENS.md` | ✅ proposed (confirm) |
| `/docs/PRD.md` | after approval |
| `/docs/ARCHITECTURE.md` | after approval |
| `/docs/PERMISSIONS.md` | after approval (matrix above is the seed) |
| `/docs/JOURNEYS.md` | after approval |
| `/docs/ROADMAP.md` | after approval |
| `/docs/AI_READINESS.md` | after approval |
| `SECURITY.md` | after approval |
| `README.md` | with Phase 0 |

---

## What I will NOT do (per Section 13)
No building all modules at once · no AI features in v1 · no secrets in frontend ·
no clinical data to Support Match · no real participant data in seeds · no screen
without empty/loading/error states.
