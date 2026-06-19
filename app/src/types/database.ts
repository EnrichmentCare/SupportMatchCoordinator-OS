// Minimal hand-written types for Phase 0.
// Regenerate the full set after migrations with:
//   supabase gen types typescript --project-id wkviryslxklnomrphxix > src/types/database.ts

export type OrgRole =
  | "admin"
  | "team_leader"
  | "specialist_support_coordinator"
  | "support_coordinator"
  | "participant"
  | "nominee"
  | "provider"
  | "support_worker";

export type RagStatus = "green" | "amber" | "red";
export type ParticipantStatus = "prospect" | "active" | "on_hold" | "exited";
export type SwrStatus =
  | "requested"
  | "received"
  | "matching"
  | "worker_proposed"
  | "placed"
  | "active"
  | "cancelled"
  | "closed";

export interface Organisation {
  id: string;
  name: string;
  abn: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_support_match_admin: boolean;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
}

export interface Participant {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  status: ParticipantStatus;
  rag_status: RagStatus;
  rag_reason: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  assigned_coordinator: string | null;
  updated_at: string;
}

export interface SupportMatchLead {
  request_id: string;
  reference: string;
  org_id: string;
  status: SwrStatus;
  suburb: string | null;
  postcode: string | null;
  state: string | null;
  gender_preference: string | null;
  interests: string[] | null;
  languages: string[] | null;
  support_needs_summary: string | null;
  hours_per_week: number | null;
  funding_type: string | null;
  requested_at: string;
  placed_at: string | null;
}

// Loose Database shape so the typed client compiles. Tables we read directly:
export interface Database {
  public: {
    Tables: {
      organisations: { Row: Organisation; Insert: Partial<Organisation>; Update: Partial<Organisation> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      memberships: { Row: Membership; Insert: Partial<Membership>; Update: Partial<Membership> };
      participants: { Row: Participant; Insert: Partial<Participant>; Update: Partial<Participant> };
    };
    Views: {
      support_match_leads: { Row: SupportMatchLead };
    };
    Functions: {
      create_organisation: {
        Args: {
          p_name: string;
          p_abn?: string | null;
          p_state?: string | null;
          p_suburb?: string | null;
          p_postcode?: string | null;
          p_phone?: string | null;
          p_email?: string | null;
        };
        Returns: Organisation;
      };
      submit_support_worker_request: {
        Args: { p_participant_id: string; p_consent_id: string; p_internal_notes?: string | null };
        Returns: unknown;
      };
      sm_list_leads: { Args: Record<string, never>; Returns: SupportMatchLead[] };
      sm_update_lead_status: {
        Args: { p_request_id: string; p_status: SwrStatus; p_note?: string | null };
        Returns: SupportMatchLead;
      };
      swr_funnel: { Args: { p_org: string }; Returns: { status: SwrStatus; count: number }[] };
    };
    Enums: Record<string, never>;
  };
}
