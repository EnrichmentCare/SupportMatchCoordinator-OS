# Coordinator OS — Entity Relationship Diagram

Everything connects to the **participant** and writes to the **timeline**.

```mermaid
erDiagram
    organisations ||--o{ memberships : has
    profiles ||--o{ memberships : "belongs via"
    organisations ||--o{ participants : owns
    organisations ||--o{ providers : owns

    participants ||--o{ participant_shares : shared_with
    participants ||--o{ participant_contacts : has
    participants ||--o{ plans : has
    plans ||--o{ funding_categories : breaks_into
    plans ||--o{ goals : sets
    participants ||--o{ goals : pursues

    providers ||--o{ provider_contacts : has
    providers ||--o{ saved_providers : preferred_in
    providers ||--o{ provider_engagements : prm

    participants ||--o{ referrals : subject_of
    providers ||--o{ referrals : receives
    referrals ||--o{ referral_events : history

    participants ||--o{ consents : grants
    consents ||--o{ support_worker_requests : authorises
    participants ||--o{ support_worker_requests : about
    support_worker_requests ||--o{ swr_events : status_history
    support_workers ||--o{ support_worker_requests : proposed_for
    support_worker_requests ||..|| support_match_leads : "curated view"

    participants ||--o{ tasks : has
    providers ||--o{ tasks : has
    referrals ||--o{ tasks : has
    participants ||--o{ notes : has
    participants ||--o{ meetings : has
    participants ||--o{ documents : has

    participants ||--o{ timeline_events : feeds
    profiles ||--o{ notifications : receives
    organisations ||--o{ automations : runs
    organisations ||--o{ audit_log : records
    participants ||--o{ ai_outputs : "future (stub)"

    organisations {
        uuid id PK
        text name
        text abn
        jsonb settings
    }
    profiles {
        uuid id PK "= auth.users.id"
        text full_name
        bool is_support_match_admin "platform flag"
    }
    memberships {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        enum role
    }
    participants {
        uuid id PK
        uuid org_id FK
        text first_name
        text last_name
        text ndis_number "sensitive"
        enum plan_management
        enum status
        enum rag_status
        text suburb
        text postcode
        enum gender_preference
        text[] interests
        jsonb availability
        numeric hours_per_week
    }
    plans {
        uuid id PK
        uuid participant_id FK
        date reassessment_due
        numeric total_budget
    }
    funding_categories {
        uuid id PK
        uuid plan_id FK
        enum bucket
        numeric allocated
        numeric used
        numeric remaining "generated"
    }
    referrals {
        uuid id PK
        uuid participant_id FK
        uuid provider_id FK
        enum stage
    }
    consents {
        uuid id PK
        uuid participant_id FK
        enum type "share_with_support_match"
        enum status
    }
    support_worker_requests {
        uuid id PK
        uuid participant_id FK "internal only"
        uuid consent_id FK "required"
        enum status
        text reference
        text suburb "curated"
        enum gender_preference "curated"
        text[] interests "curated"
        text internal_notes "NOT shared"
    }
    support_match_leads {
        uuid request_id "curated columns only"
        text reference
        enum status
        text suburb
        text support_needs_summary
    }
    timeline_events {
        uuid id PK
        uuid participant_id FK
        enum event_type
        text ref_table
        uuid ref_id
        timestamptz occurred_at
    }
```

## Privacy boundary (the critical line)

`support_worker_requests` holds **both** an internal link to `participants` **and** a
curated snapshot of matching-only fields. Support Match Admin reads **only** the
`support_match_leads` view (via a security-definer RPC), which exposes the curated
columns and never `participant_id`, `internal_notes`, NDIS number, plans, notes, or
any clinical table.
