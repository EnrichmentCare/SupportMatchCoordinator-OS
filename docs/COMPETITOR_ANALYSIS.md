# Coordinator OS — Competitor Analysis & What to Build

Researched the NDIS support-coordination software market (2026): Vertex360, Lumary,
SupportAbility, Brevity, Careview, ShiftCare, GoodHuman, CTARS, CareMaster, Webnity.

## The landscape

| Tool | Positioning | Notable for |
|---|---|---|
| **Lumary** | Enterprise, Salesforce-based all-in-one | Plans, rostering, billing, client services; big orgs, big budgets |
| **SupportAbility** | Established NDIS all-rounder | Budgets, goals, service delivery, rostering, billing, compliance |
| **Brevity** | Multi-funder | NDIS + aged care billing across programs |
| **Careview** | SIL / group homes | House-based rostering, shared-support billing |
| **ShiftCare** | Cheap & popular ($9/user/mo) | Rostering, billing, worker + participant apps, claims |
| **GoodHuman** | Modern, collaborative ($25/mo, min 50 users) | Participant comms, collaboration |
| **Vertex360** | All-in-one provider platform | The most feature-complete SC module we saw (detailed below) |

**Vertex360's SC module** (the closest direct comparison) ships: a dashboard with
**billable-hours**, **weekly billable/non-billable breakdown**, **total COS clients** and a
**coordinator leaderboard**; participant list; detailed case notes; NDIS compliance export;
**invoicing**; **NDIS claims batch file**; **funds management**; **NDIS digital price
catalogue**; service-provider database; **digital agreement generation**; risk + incident
management; e-forms; roles/permissions; and **worker/manager mobile apps**.

## Feature scorecard — Coordinator OS vs the market

✅ have · 🔨 partial · ❌ gap

| Capability | Us | Market | Notes |
|---|---|---|---|
| Participant CRM / 360 record | ✅ | ✅ | Ours is deeper (health, plan, care team, contacts, risk, COI) |
| Case notes | ✅ | ✅ | We have contact type, duration, billable, linked goal |
| Budget / funds tracking | ✅ | ✅ | Core/CB/Capital + alerts |
| Goals & outcomes | ✅ | ✅ | |
| Provider directory + PRM | ✅ | ✅ | |
| Referral pipeline | ✅ | 🔨 | Kanban — most rivals don't have this |
| Incident + risk management | ✅ | ✅ | We added Commission deadline timers |
| Conflict-of-interest register | ✅ | ❌ | **Rare differentiator** |
| Automation engine | ✅ | ❌ | **Rare differentiator** |
| Alerts / needs-attention feed | ✅ | 🔨 | |
| Reporting dashboards | ✅ | ✅ | |
| NDIA report generator | ✅ | 🔨 | Printable; most make you assemble manually |
| Support-worker sourcing (Support Match) | ✅ | ❌ | **Unique** — no rival has a built-in matching marketplace |
| **Billable-hours org dashboard + coordinator leaderboard** | ❌ | ✅ | Table stakes; we have the data already |
| **NDIS price guide / line items + bulk claim file** | ❌ | ✅ | **Biggest gap** — how SC time gets paid |
| **Invoicing** | ❌ | ✅ | (You run this via ShiftCare→Xero today) |
| **Service agreement generation + e-sign** | 🔨 | ✅ | We store docs; rivals generate + sign (you have SignNow) |
| **Participant / worker / provider portals + mobile app** | ❌ | ✅ | On the brief's Phase 3 |
| **Global / centralised search** | ❌ | ✅ | Quick win |
| **Feedback & complaints register** | ❌ | ✅ | NDIS-required; quick win |
| **E-forms / custom assessment templates** | ❌ | 🔨 | |
| Rostering | ❌ (by design) | ✅ | Out of scope — you use ShiftCare |

## What this tells us

1. **We're already ahead on depth and uniqueness** — the 360 record, referral Kanban,
   COI, automations, the NDIA report, and especially the **Support Match loop** are things
   most rivals don't have. That's the moat; keep leaning in.
2. **The clearest gaps are money-flow and visibility**: org-level **billable-hours
   dashboard + leaderboard**, **NDIS line-item billing / bulk claim export**, and
   **service-agreement generation + e-sign**. These are the things buyers tick off on a
   feature comparison.
3. **Two quick wins** that every rival has and we don't: **global search** and a
   **feedback/complaints register**.

## Recommended build order (impact ÷ effort, no AI)

1. ⭐ **Billable-hours dashboard + coordinator leaderboard** — we already capture billable
   minutes per note; roll it up org-wide (this week / per coordinator / per participant).
   Directly matches Vertex360's headline dashboard. *Small–medium.*
2. ⭐ **Global search** — one bar to jump to any participant, provider or note. *Small.*
3. ⭐ **Feedback & complaints register** — log, categorise, track to resolution
   (NDIS-required). *Small.*
4. **Service agreement generator + e-sign** — generate a branded agreement from
   participant/plan data; send via SignNow (which you already use). *Medium.*
5. **NDIS line-item billing + bulk claim export** — price-guide items, claimable line
   entries from billable notes, export the NDIA bulk-upload CSV. The biggest competitive
   tick, and turns SC time into money. *Medium–large.*
6. **Participant / provider / worker portals** — already on the roadmap. *Large.*

## Sources

- [Gitnux — Top 10 support coordination software 2026](https://gitnux.org/best/support-coordination-software/)
- [NDISCompliant — Best NDIS software for providers 2026](https://ndiscompliant.com.au/blog/best-ndis-software-providers)
- [SafetyCulture — 10 best NDIS software 2026](https://safetyculture.com/apps/ndis-software)
- [Vertex360 — Support Coordination module](https://vertex360.io/ndis-support-coordination-software/)
- [Careview — Support Coordination](https://www.careviewapp.com/how-we-help/support-coordination/)
- [ShiftCare — NDIS support coordination software](https://shiftcare.com/solutions/ndis-support-coordination-software)
- [GoodHuman — Support coordination](https://www.goodhuman.me/solutions/support-coordination)
- [CTARS — NDIS client management software](https://ctars.com.au/ndis-client-management-software/)
- [Vertex360 — Pricing](https://vertex360.io/pricing/)
