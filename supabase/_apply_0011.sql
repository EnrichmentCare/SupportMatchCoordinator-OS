-- =============================================================================
-- Coordinator OS — Migration 0011
-- Charge-items catalogue (NDIS price-guide line items) + charge fields on notes,
-- so a case note can carry a billable charge (Astalty-style).
-- =============================================================================

create table if not exists charge_items (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organisations(id) on delete cascade,
  code        text not null,                 -- NDIS support item number
  name        text,
  unit        text not null default 'hour',  -- hour | each | km
  unit_price  numeric(10,2),
  gst_code    text default 'P2',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
create index if not exists charge_items_org_idx on charge_items (org_id, active);

create trigger trg_charge_items_updated_at before update on charge_items for each row execute function set_updated_at();
alter table charge_items enable row level security;
create policy charge_items_member_all on charge_items for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Charge fields on case notes
alter table notes
  add column if not exists service_type   text,        -- direct | non_face_to_face | travel | non_labour
  add column if not exists charge_item_id uuid references charge_items(id) on delete set null,
  add column if not exists unit_price     numeric(10,2);
