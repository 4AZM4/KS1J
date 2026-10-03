// Generated from the live Supabase schema. Regenerate after every migration
// (Supabase connector: generate_typescript_types, or `supabase gen types typescript`).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: { body: string; created_at: string; created_by: string | null; id: string; published_at: string | null; title: string }
        Insert: { body: string; created_at?: string; created_by?: string | null; id?: string; published_at?: string | null; title: string }
        Update: { body?: string; created_at?: string; created_by?: string | null; id?: string; published_at?: string | null; title?: string }
        Relationships: Rel[]
      }
      case_documents: {
        Row: { case_id: string; content_hash: string | null; created_at: string; id: string; kind: string; storage_path: string; uploaded_by: string }
        Insert: { case_id: string; created_at?: string; id?: string; kind: string; storage_path: string; uploaded_by: string }
        Update: { case_id?: string; created_at?: string; id?: string; kind?: string; storage_path?: string; uploaded_by?: string }
        Relationships: Rel[]
      }
      case_events: {
        Row: {
          actor_id: string | null; case_id: string; created_at: string
          from_status: Database["public"]["Enums"]["case_status"] | null; id: number; note: string | null
          to_status: Database["public"]["Enums"]["case_status"]
        }
        Insert: {
          actor_id?: string | null; case_id: string; created_at?: string
          from_status?: Database["public"]["Enums"]["case_status"] | null; id?: never; note?: string | null
          to_status: Database["public"]["Enums"]["case_status"]
        }
        Update: {
          actor_id?: string | null; case_id?: string; created_at?: string
          from_status?: Database["public"]["Enums"]["case_status"] | null; id?: never; note?: string | null
          to_status?: Database["public"]["Enums"]["case_status"]
        }
        Relationships: Rel[]
      }
      cases: {
        Row: {
          applicant_id: string; approved_at: string | null; approved_by: string | null; assigned_to: string | null
          case_no: number; category: Database["public"]["Enums"]["case_category"]; created_at: string; details: string | null; id: string
          lineage_verified: boolean; public_summary: string | null; raised_amount: number; requested_amount: number
          show_identity: boolean; status: Database["public"]["Enums"]["case_status"]; submitted_by: string
          target_amount: number | null; title: string; type: Database["public"]["Enums"]["case_type"]
          updated_at: string; verified_at: string | null; verified_by: string | null
        }
        Insert: {
          applicant_id: string; approved_at?: string | null; approved_by?: string | null; assigned_to?: string | null
          case_no?: never; category: Database["public"]["Enums"]["case_category"]; created_at?: string; details?: string | null; id?: string
          lineage_verified?: boolean; public_summary?: string | null; raised_amount?: number; requested_amount: number
          show_identity?: boolean; status?: Database["public"]["Enums"]["case_status"]; submitted_by: string
          target_amount?: number | null; title: string; type: Database["public"]["Enums"]["case_type"]
          updated_at?: string; verified_at?: string | null; verified_by?: string | null
        }
        Update: {
          applicant_id?: string; approved_at?: string | null; approved_by?: string | null; assigned_to?: string | null
          case_no?: never; category?: Database["public"]["Enums"]["case_category"]; created_at?: string; details?: string | null; id?: string
          lineage_verified?: boolean; public_summary?: string | null; raised_amount?: number; requested_amount?: number
          show_identity?: boolean; status?: Database["public"]["Enums"]["case_status"]; submitted_by?: string
          target_amount?: number | null; title?: string; type?: Database["public"]["Enums"]["case_type"]
          updated_at?: string; verified_at?: string | null; verified_by?: string | null
        }
        Relationships: Rel[]
      }
      disbursements: {
        Row: { amount: number; case_id: string; created_at: string; fund: Database["public"]["Enums"]["fund_type"]; id: string; payee: string; proof_path: string | null; recorded_by: string }
        Insert: { amount: number; case_id: string; created_at?: string; fund: Database["public"]["Enums"]["fund_type"]; id?: string; payee: string; proof_path?: string | null; recorded_by: string }
        Update: { amount?: number; case_id?: string; created_at?: string; fund?: Database["public"]["Enums"]["fund_type"]; id?: string; payee?: string; proof_path?: string | null; recorded_by?: string }
        Relationships: Rel[]
      }
      document_checks: {
        Row: {
          case_id: string; checked_at: string; checked_by: string | null; document_id: string; expected_amount: number | null
          found_amount: number | null; found_institution: string | null; found_name: string | null; method: string
          mismatches: string[]; outcome: string
        }
        Insert: never
        Update: never
        Relationships: Rel[]
      }
      donations: {
        Row: {
          amount: number; case_id: string | null; created_at: string; donor_id: string; fund: Database["public"]["Enums"]["fund_type"]
          gateway_ref: string | null; id: string; institution_id: string | null; paid_at: string | null; status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number; case_id?: string | null; created_at?: string; donor_id: string; fund: Database["public"]["Enums"]["fund_type"]
          gateway_ref?: string | null; id?: string; institution_id?: string | null; paid_at?: string | null; status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number; case_id?: string | null; created_at?: string; donor_id?: string; fund?: Database["public"]["Enums"]["fund_type"]
          gateway_ref?: string | null; id?: string; institution_id?: string | null; paid_at?: string | null; status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: Rel[]
      }
      education_loans: {
        Row: {
          agreed_emi: number | null; autopay_ref: string | null; autopay_status: string; borrower_id: string; case_id: string
          committee_accepted_emi: number | null; course_end_date: string | null; created_at: string; family_accepted_emi: number | null
          grace_ends_on: string | null; grace_extension_months: number; grace_months: number; guarantor_member_id: string | null; jamaat_guarantee: boolean; mentor_member_id: string | null
          guarantor_name: string; guarantor_phone: string; id: string; max_tenure_months: number; next_due_date: string | null
          outstanding: number; payer_member_id: string; plan_agreed_at: string | null; plan_agreed_by: string | null
          principal: number; status: Database["public"]["Enums"]["loan_status"]
        }
        Insert: {
          agreed_emi?: number | null; autopay_ref?: string | null; autopay_status?: string; borrower_id: string; case_id: string
          committee_accepted_emi?: number | null; course_end_date?: string | null; created_at?: string; family_accepted_emi?: number | null
          grace_ends_on?: string | null; grace_extension_months?: number; grace_months?: number; guarantor_member_id?: string | null; jamaat_guarantee?: boolean; mentor_member_id?: string | null
          guarantor_name: string; guarantor_phone: string; id?: string; max_tenure_months?: number; next_due_date?: string | null
          outstanding: number; payer_member_id?: string; plan_agreed_at?: string | null; plan_agreed_by?: string | null
          principal: number; status?: Database["public"]["Enums"]["loan_status"]
        }
        Update: {
          agreed_emi?: number | null; autopay_ref?: string | null; autopay_status?: string; borrower_id?: string; case_id?: string
          committee_accepted_emi?: number | null; course_end_date?: string | null; created_at?: string; family_accepted_emi?: number | null
          grace_ends_on?: string | null; grace_extension_months?: number; grace_months?: number; guarantor_member_id?: string | null; jamaat_guarantee?: boolean; mentor_member_id?: string | null
          guarantor_name?: string; guarantor_phone?: string; id?: string; max_tenure_months?: number; next_due_date?: string | null
          outstanding?: number; payer_member_id?: string; plan_agreed_at?: string | null; plan_agreed_by?: string | null
          principal?: number; status?: Database["public"]["Enums"]["loan_status"]
        }
        Relationships: Rel[]
      }
      fraud_flags: {
        Row: { case_id: string; created_at: string; document_id: string | null; id: string; matched_case_id: string | null; reason: string; reviewed_at: string | null; reviewed_by: string | null; status: string }
        Insert: { case_id: string; created_at?: string; document_id?: string | null; id?: string; matched_case_id?: string | null; reason: string; reviewed_at?: string | null; reviewed_by?: string | null; status?: string }
        Update: { case_id?: string; created_at?: string; document_id?: string | null; id?: string; matched_case_id?: string | null; reason?: string; reviewed_at?: string | null; reviewed_by?: string | null; status?: string }
        Relationships: Rel[]
      }
      households: {
        Row: { address: string | null; area: string; created_at: string; id: string }
        Insert: { address?: string | null; area: string; created_at?: string; id?: string }
        Update: { address?: string | null; area?: string; created_at?: string; id?: string }
        Relationships: Rel[]
      }
      income_declarations: {
        Row: { declared_at: string; id: string; loan_id: string; monthly_income: number; proof_path: string | null }
        Insert: { declared_at?: string; id?: string; loan_id: string; monthly_income: number; proof_path?: string | null }
        Update: { declared_at?: string; id?: string; loan_id?: string; monthly_income?: number; proof_path?: string | null }
        Relationships: Rel[]
      }
      helpdesk_questions: {
        Row: { asked_at: string; document_ids: string[]; id: string; outcome: string; question: string }
        Insert: { asked_at?: string; document_ids?: string[]; id?: string; outcome: string; question: string }
        Update: { asked_at?: string; document_ids?: string[]; id?: string; outcome?: string; question?: string }
        Relationships: Rel[]
      }
      kb_chunks: {
        Row: { body: string; document_id: string; heading: string | null; id: string; position: number }
        Insert: { body: string; document_id: string; heading?: string | null; id?: string; position?: number }
        Update: { body?: string; document_id?: string; heading?: string | null; id?: string; position?: number }
        Relationships: Rel[]
      }
      kb_documents: {
        Row: { added_by: string | null; approved_at: string | null; approved_by: string | null; created_at: string; id: string; source_ref: string; status: string; title: string }
        Insert: { added_by?: string | null; approved_at?: string | null; approved_by?: string | null; created_at?: string; id?: string; source_ref: string; status?: string; title: string }
        Update: { added_by?: string | null; approved_at?: string | null; approved_by?: string | null; created_at?: string; id?: string; source_ref?: string; status?: string; title?: string }
        Relationships: Rel[]
      }
      institution_remittances: {
        Row: { amount: number; created_at: string; id: string; institution_id: string; recorded_by: string | null; reference: string; remitted_on: string }
        Insert: { amount: number; created_at?: string; id?: string; institution_id: string; recorded_by?: string | null; reference: string; remitted_on?: string }
        Update: { amount?: number; created_at?: string; id?: string; institution_id?: string; recorded_by?: string | null; reference?: string; remitted_on?: string }
        Relationships: Rel[]
      }
      institutions: {
        Row: { added_by: string | null; city: string | null; created_at: string; id: string; ijazah_document_path: string; ijazah_verified_at: string | null; ijazah_verified_by: string | null; is_active: boolean; marja: string; name: string }
        Insert: { added_by?: string | null; city?: string | null; created_at?: string; id?: string; ijazah_document_path: string; ijazah_verified_at?: string | null; ijazah_verified_by?: string | null; is_active?: boolean; marja: string; name: string }
        Update: { added_by?: string | null; city?: string | null; created_at?: string; id?: string; ijazah_document_path?: string; ijazah_verified_at?: string | null; ijazah_verified_by?: string | null; is_active?: boolean; marja?: string; name?: string }
        Relationships: Rel[]
      }
      jamaat_settings: {
        Row: { demo_mode: boolean; id: boolean; loan_grace_months: number; loan_max_tenure_months: number; pause_requests_when_loan_overdue: boolean; updated_at: string }
        Insert: { demo_mode?: boolean; id?: boolean; loan_grace_months?: number; loan_max_tenure_months?: number; pause_requests_when_loan_overdue?: boolean; updated_at?: string }
        Update: { demo_mode?: boolean; id?: boolean; loan_grace_months?: number; loan_max_tenure_months?: number; pause_requests_when_loan_overdue?: boolean; updated_at?: string }
        Relationships: Rel[]
      }
      khums_calculations: {
        Row: { created_at: string; id: string; khums_due: number; khums_year: number; member_id: string; sehme_imam: number; sehme_sadaat: number; surplus: number }
        Insert: { created_at?: string; id?: string; khums_due: number; khums_year: number; member_id: string; sehme_imam: number; sehme_sadaat: number; surplus: number }
        Update: { created_at?: string; id?: string; khums_due?: number; khums_year?: number; member_id?: string; sehme_imam?: number; sehme_sadaat?: number; surplus?: number }
        Relationships: Rel[]
      }
      khums_profiles: {
        Row: { marja: string | null; member_id: string; updated_at: string; year_end_day: number; year_end_month: number }
        Insert: { marja?: string | null; member_id: string; updated_at?: string; year_end_day: number; year_end_month: number }
        Update: { marja?: string | null; member_id?: string; updated_at?: string; year_end_day?: number; year_end_month?: number }
        Relationships: Rel[]
      }
      notifications: {
        Row: { body: string; case_id: string | null; created_at: string; id: string; kind: string; member_id: string; read_at: string | null; title: string }
        Insert: never
        Update: { read_at?: string | null }
        Relationships: Rel[]
      }
      lawajam_dues: {
        Row: { amount: number; created_at: string; household_id: string; id: string; period: string; status: Database["public"]["Enums"]["payment_status"] }
        Insert: { amount: number; created_at?: string; household_id: string; id?: string; period: string; status?: Database["public"]["Enums"]["payment_status"] }
        Update: { amount?: number; created_at?: string; household_id?: string; id?: string; period?: string; status?: Database["public"]["Enums"]["payment_status"] }
        Relationships: Rel[]
      }
      lawajam_payments: {
        Row: { amount: number; created_at: string; due_id: string; gateway_ref: string | null; id: string; paid_at: string | null; paid_by: string; status: Database["public"]["Enums"]["payment_status"] }
        Insert: { amount: number; created_at?: string; due_id: string; gateway_ref?: string | null; id?: string; paid_at?: string | null; paid_by: string; status?: Database["public"]["Enums"]["payment_status"] }
        Update: { amount?: number; created_at?: string; due_id?: string; gateway_ref?: string | null; id?: string; paid_at?: string | null; paid_by?: string; status?: Database["public"]["Enums"]["payment_status"] }
        Relationships: Rel[]
      }
      ledger_entries: {
        Row: { amount: number; case_id: string | null; created_at: string; created_by: string | null; donation_id: string | null; fund: Database["public"]["Enums"]["fund_type"]; id: number; institution_id: string | null; memo: string }
        Insert: { amount: number; case_id?: string | null; created_at?: string; created_by?: string | null; donation_id?: string | null; fund: Database["public"]["Enums"]["fund_type"]; id?: never; institution_id?: string | null; memo: string }
        Update: { amount?: number; case_id?: string | null; created_at?: string; created_by?: string | null; donation_id?: string | null; fund?: Database["public"]["Enums"]["fund_type"]; id?: never; institution_id?: string | null; memo?: string }
        Relationships: Rel[]
      }
      loan_hardship_requests: {
        Row: { created_at: string; decided_at: string | null; decided_by: string | null; id: string; kind: string; loan_id: string; new_emi: number | null; pause_months: number | null; proof_path: string; reason: string; requested_by: string; status: string }
        Insert: { created_at?: string; decided_at?: string | null; decided_by?: string | null; id?: string; kind: string; loan_id: string; new_emi?: number | null; pause_months?: number | null; proof_path: string; reason: string; requested_by: string; status?: string }
        Update: { created_at?: string; decided_at?: string | null; decided_by?: string | null; id?: string; kind?: string; loan_id?: string; new_emi?: number | null; pause_months?: number | null; proof_path?: string; reason?: string; requested_by?: string; status?: string }
        Relationships: Rel[]
      }
      loan_repayments: {
        Row: { amount: number; created_at: string; gateway_ref: string | null; id: string; loan_id: string; paid_at: string | null; status: Database["public"]["Enums"]["payment_status"] }
        Insert: { amount: number; created_at?: string; gateway_ref?: string | null; id?: string; loan_id: string; paid_at?: string | null; status?: Database["public"]["Enums"]["payment_status"] }
        Update: { amount?: number; created_at?: string; gateway_ref?: string | null; id?: string; loan_id?: string; paid_at?: string | null; status?: Database["public"]["Enums"]["payment_status"] }
        Relationships: Rel[]
      }
      member_roles: {
        Row: { granted_at: string; granted_by: string | null; member_id: string; role: Database["public"]["Enums"]["admin_role"] }
        Insert: { granted_at?: string; granted_by?: string | null; member_id: string; role: Database["public"]["Enums"]["admin_role"] }
        Update: { granted_at?: string; granted_by?: string | null; member_id?: string; role?: Database["public"]["Enums"]["admin_role"] }
        Relationships: Rel[]
      }
      members: {
        Row: { address: string | null; area: string | null; created_at: string; full_name: string; household_id: string | null; id: string; jamaat_number: string | null; language: string; membership_verified: boolean; phone: string | null }
        Insert: { address?: string | null; area?: string | null; created_at?: string; full_name: string; household_id?: string | null; id: string; jamaat_number?: string | null; language?: string; membership_verified?: boolean; phone?: string | null }
        Update: { address?: string | null; area?: string | null; created_at?: string; full_name?: string; household_id?: string | null; id?: string; jamaat_number?: string | null; language?: string; membership_verified?: boolean; phone?: string | null }
        Relationships: Rel[]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      accept_loan_emi: { Args: { p_emi: number; p_loan: string }; Returns: Database["public"]["Tables"]["education_loans"]["Row"] }
      create_lawajam_period: { Args: { p_amount: number; p_period: string }; Returns: number }
      demo_confirm_payment: { Args: { p_id: string; p_kind: string }; Returns: undefined }
      has_role: { Args: { r: Database["public"]["Enums"]["admin_role"] }; Returns: boolean }
      household_loan_overdue: { Args: { p_household: string }; Returns: boolean }
      institution_sehme_imam_balance: { Args: { p_institution: string }; Returns: number }
      is_staff: { Args: never; Returns: boolean }
      search_help: {
        Args: { max_results?: number; q: string }
        Returns: { body: string; chunk_id: string; document_id: string; heading: string | null; rank: number; source_ref: string; title: string }[]
      }
      is_system: { Args: never; Returns: boolean }
      staff_directory: { Args: never; Returns: { full_name: string; id: string; phone: string | null; roles: string[] }[] }
      public_impact: {
        Args: never
        Returns: { families_helped: number; loans_repaid: number; open_needs: number; raised: number; students_with_loans: number }[]
      }
      list_public_cases: {
        Args: { p_category?: Database["public"]["Enums"]["case_category"] }
        Returns: {
          case_no: number; category: Database["public"]["Enums"]["case_category"]; id: string
          public_summary: string | null; raised_amount: number; status: Database["public"]["Enums"]["case_status"]; target_amount: number; title: string
          type: Database["public"]["Enums"]["case_type"]
        }[]
      }
      loan_followup_list: {
        Args: never
        Returns: {
          agreed_emi: number; autopay_status: string; borrower: string; days_late: number; guarantor: string; guarantor_phone: string
          loan_id: string; next_due_date: string; outstanding: number; payer: string; stage: string
        }[]
      }
      loan_followup_stage: { Args: { p_next_due: string; p_pending_hardship: boolean }; Returns: string }
      my_household: { Args: never; Returns: string }
      my_household_members: { Args: never; Returns: { full_name: string; is_me: boolean; membership_verified: boolean }[] }
      record_document_check: {
        Args: { p_amount?: number; p_document: string; p_institution?: string; p_method: string; p_name?: string }
        Returns: Database["public"]["Tables"]["document_checks"]["Row"]
      }
      preview_public_case: {
        Args: { p_case: string; p_summary: string }
        Returns: { public_summary: string | null; title: string }[]
      }
      refresh_loan_statuses: { Args: never; Returns: number }
      start_autopay: { Args: { p_loan: string }; Returns: string }
    }
    Enums: {
      admin_role: "volunteer" | "verifier" | "trustee" | "finance" | "super_admin"
      case_category: "sadaat" | "non_sadaat"
      case_status: "submitted" | "verified" | "approved" | "published" | "funded" | "disbursed" | "closed" | "rejected"
      case_type: "medical" | "education" | "ration" | "scholarship" | "education_loan" | "other"
      fund_type: "sehme_sadaat" | "sehme_imam" | "general" | "lawajam" | "loan_repayment"
      loan_status: "studying" | "grace" | "repaying" | "paused" | "closed" | "converted_to_grant"
      payment_status: "pending" | "paid" | "failed" | "refunded"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
