# Coordinator OS — Feature Ideas & Roadmap

Researched against what NDIS support coordinators actually do in 2026 (mid-reform),
their biggest pain points, the compliance they're held to, and what the established
tools (SupportAbility, Lumary, Brevity, ShiftCare, CareMaster, Careview) offer.

**The core problem we're solving** (straight from the sector): a coordinator's work is
*fractured* — information lives across spreadsheets, sticky notes and email chains, case
notes eat hours, and when an audit or NDIA report is due they're "piecing it together
after the fact." Coordinator OS already attacks this by making the participant record the
single connected spine. These ideas extend that.

Legend: ✅ already built · 🔨 partly built · ⭐ high-impact for NDIS coordinators · 💼 especially relevant to your Support Match model

---

## 1. Compliance & reporting (the biggest time sink → biggest win)

- ⭐ **PACE-aligned NDIA reports.** The NDIA now mandates standardised support-coordinator
  report templates for check-ins and plan reassessments. Auto-draft these from data we
  already hold (goals + progress, supports in place, budget use, outcomes, risks) so a
  report is one click instead of hours. This is the single biggest admin saver.
- ⭐💼 **Conflict-of-interest register & disclosure.** Coordinators must identify, manage
  and *declare* real or perceived conflicts — and this is acute when the coordinator's
  org also delivers supports. Because referring a participant to Support Match / Enrichment
  Care is exactly that situation, a built-in COI disclosure + recorded participant choice
  ("I was offered options and chose…") both keeps you compliant **and** protects the
  referral model. Few tools do this well.
- 🔨 **Reportable-incident workflow.** We log incidents; add the NDIS Commission rules on
  top — 24-hour notification + 5-business-day follow-up countdown timers, official
  categorisation, reportable flag, and status tracking, with alerts before deadlines.
- 🔨 **Document & check expiry tracking.** Service agreements, consents, plan end dates,
  worker screening — surface upcoming expiries (some already in the alerts bell).
- **Compliance dashboard / audit pack.** A practice-standards checklist per participant and
  a one-click "audit-ready" export, so an audit is a download, not a scramble.

## 2. Case notes & billable time (coordinators bill their hours)

- ⭐ **Structured case notes.** Upgrade Notes to proper case notes: contact type
  (phone/email/face-to-face), template (e.g. SOAP), linked goal, and **billable vs
  non-billable** with **duration**. This is how coordinators actually record work.
- ⭐ **Support-coordination hour tracking & claiming.** We store SC hours allocated on the
  plan; add running used-vs-remaining from billable notes, a burn-down, and exportable
  claim lines / invoices (the "billing" pain point). Ties into your ShiftCare/Xero flow.
- **Voice-to-note / quick capture.** Voice recording and quick mobile capture are the
  proven way coordinators cut note-taking time. (Pairs naturally with the future AI layer.)

## 3. Plan & budget intelligence

- 🔨 **Budget burn-down & projections.** We track Core/CB/Capital; add projected
  exhaustion date, over/under-spend flags, and monthly burn rate per category.
- **Service bookings & quotes.** Track quotes requested from providers and service
  bookings with dollar values, so committed vs spent vs remaining is visible.
- **Reform readiness.** Big changes are coming — new framework planning from mid-2026,
  budget adjustments from Oct 2026, plan-management changes from Oct 2027, and support
  coordination becoming a *commissioned* service from July 2028. Worth a light "plan
  change / reassessment prep" workflow and keeping budgets flexible to these shifts.

## 4. Intake & onboarding

- ⭐ **Referral intake workflow.** A front-door for new referrals → eligibility/triage →
  plan upload → setup checklist → assigned. Turns ad-hoc emails into a pipeline (mirrors
  the referral Kanban we built for providers).
- **Participant onboarding checklist.** Consent, service agreement, COI disclosure, goal
  setting, first contact — a repeatable checklist so nothing is missed on day one.

## 5. Communication & collaboration

- ⭐ **Unified communication log.** Log calls, emails and SMS against the participant
  (the email piece is the Phase 3 email work). One place for "what was said and when."
- **Secure participant / nominee portal.** Participants and nominees see shared goals,
  upcoming meetings and documents — the portal in the original brief.
- **Provider/worker portal.** Providers view referrals sent to them; workers manage
  availability. (Also in the brief.)
- **Calendar & appointments.** Schedule appointments and meetings with reminders; optional
  Google/Outlook sync.

## 6. Goals, outcomes & capacity building

- 🔨 **Outcomes framework.** We track goals + progress; add an outcomes/▸evidence model
  aligned to NDIS goal categories and "building participant capacity to self-manage."
- **Goal review reminders** tied to plan review dates.

## 7. Workflow & productivity

- ✅ **Alerts feed, global task capture, automations** — done.
- **Recurring tasks & check-in cadences.** We have check-in frequency; add recurring tasks
  and auto-generated review/reassessment prep tasks.
- **Saved views / filters** on the caseload (by RAG, coordinator, plan-review-soon).
- **Bulk actions** (reassign caseload, bulk status).

## 8. Insights & business health (you run three businesses)

- 🔨 **Reports** — built. Extend with: time-spent-per-participant, SC-hours
  profitability, referral-source analytics, and a **Support Match conversion funnel**
  (requests → placed) so you can see the revenue mechanic working.
- **Caseload capacity planning** — coordinator workload balancing.

## 9. AI-ready (architecture only — deliberately NOT built per the brief)

Everything above is structured so these can be added later without rework:
AI case-note drafting from a voice memo, AI-generated NDIA reports, AI budget-exhaustion
prediction, AI participant insights, AI provider matching.

---

## Recommended next 3 (best impact-to-effort, no AI)

1. ⭐ **Structured case notes + billable time** — hits the #1 daily pain (notes) and unlocks SC-hour billing. Mostly an upgrade to what exists.
2. ⭐💼 **Conflict-of-interest disclosure + participant choice record** — compliance you specifically need, and it legitimises the Support Match referral. Small build, high value.
3. ⭐ **PACE-style NDIA report generator (data → draft, no AI)** — assemble a check-in / reassessment report from goals, budget and timeline. Turns hours into a click; perfect on-ramp for AI later.

Then: reportable-incident timers, referral intake workflow, and the participant portal.

---

## Sources

- [NDIS — Roles and key tasks of a support coordinator](https://www.ndis.gov.au/print/pdf/node/7140)
- [NDIS — Guide to working as a support coordinator](https://www.ndis.gov.au/providers/working-participants/support-coordinators/guide-working-support-coordinator)
- [NDIS — Support coordinator reporting requirements](https://www.ndis.gov.au/providers/working-participants/support-coordinators/what-are-support-coordinator-reporting-requirements)
- [MyCareSpace — PACE update: new reporting templates for support coordinators](https://mycarespace.com.au/resources/pace-update-new-reporting-templates-for-support-coordinators)
- [Team DSC — Navigating conflict of interest in support coordination](https://teamdsc.com.au/resources/navigating-conflict-of-interest-in-support-coordination)
- [NDIS — Conflicts of interest in the NDIS provider market](https://www.ndis.gov.au/providers/provider-compliance/conflicts-interest-ndis-provider-market)
- [NDIS Commission — Reportable incidents and incident management](https://www.ndiscommission.gov.au/rules-and-standards/managing-and-reporting-incidents)
- [Good Human — Solving support coordinator burnout on the NDIS](https://www.goodhuman.me/blog/support-coordinator-conundrum)
- [Careview — NDIS support coordination software](https://www.careviewapp.com/ndis-support-coordination-software-made-easy/)
- [CareMaster — How to write & manage NDIS case notes effectively](https://caremaster.com.au/post/how-to-write-manage-ndis-case-notes-effectively)
- [SupportSorted — NDIS changes 2025: PACE, endorsements & funding periods](https://www.supportsorted.com/articles/disability/support-coordination-service-planning/ndis-changes-2025-support-coordinators)
- [Dept of Health, Disability and Ageing — About the changes to the NDIS](https://www.health.gov.au/our-work/ndis-legislation-changes/amendments/ndis-amendment-securing-the-ndis-for-future-generations-bill-2026/about-the-changes-to-the-ndis)
- [NDIS Commission — Mandatory registration](https://www.ndiscommission.gov.au/about-us/ndis-commission-reform-hub/mandatory-registration)
