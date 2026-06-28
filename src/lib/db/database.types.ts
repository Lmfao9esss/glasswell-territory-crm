export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json;
          organization_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          organization_id?: string;
        };
      };
      customers: {
        Row: CustomerRow;
        Insert: CustomerInsert;
        Update: Partial<CustomerInsert>;
      };
      feedback: {
        Row: FeedbackRow;
        Insert: FeedbackInsert;
        Update: Partial<FeedbackInsert>;
      };
      follow_ups: {
        Row: FollowUpRow;
        Insert: FollowUpInsert;
        Update: Partial<FollowUpInsert>;
      };
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: Partial<JobInsert>;
      };
      knocking_sessions: {
        Row: KnockingSessionRow;
        Insert: KnockingSessionInsert;
        Update: Partial<KnockingSessionInsert>;
      };
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: Partial<LeadInsert>;
      };
      organizations: {
        Row: OrganizationRow;
        Insert: OrganizationInsert;
        Update: Partial<OrganizationInsert>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      street_locks: {
        Row: StreetLockRow;
        Insert: StreetLockInsert;
        Update: Partial<StreetLockInsert>;
      };
      streets: {
        Row: StreetRow;
        Insert: StreetInsert;
        Update: Partial<StreetInsert>;
      };
      territories: {
        Row: TerritoryRow;
        Insert: TerritoryInsert;
        Update: Partial<TerritoryInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_read_assigned_work: {
        Args: { target_organization_id: string; assigned_employee_id: string };
        Returns: boolean;
      };
      current_profile_organization_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      has_org_role: {
        Args: {
          target_organization_id: string;
          allowed_roles: Database["public"]["Enums"]["user_role"][];
        };
        Returns: boolean;
      };
      is_org_member: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      log_activity: {
        Args: {
          target_organization_id: string;
          target_actor_id: string | null;
          target_entity_type: string;
          target_entity_id: string;
          target_action: string;
          target_metadata?: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      follow_up_status: "open" | "completed" | "snoozed" | "cancelled";
      job_status:
        | "draft"
        | "quoted"
        | "booked"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "lost";
      lead_status:
        | "interested"
        | "quoted"
        | "waiting"
        | "booked"
        | "repeat_customer"
        | "no_answer"
        | "lost"
        | "do_not_contact";
      service_type: "residential" | "commercial" | "custom";
      session_status: "active" | "paused" | "completed" | "cancelled";
      street_status:
        | "not_knocked"
        | "active"
        | "paused"
        | "completed"
        | "skipped"
        | "do_not_knock";
      territory_status: "not_started" | "active" | "paused" | "completed";
      user_role: "owner" | "manager" | "employee";
    };
    CompositeTypes: Record<string, never>;
  };
};

type AuditColumns = {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

type AuditInsert = {
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
  updated_by?: string | null;
};

type OrganizationRow = AuditColumns & {
  branding: Json;
  id: string;
  name: string;
  settings: Json;
  slug: string;
};

type OrganizationInsert = AuditInsert & {
  branding?: Json;
  id?: string;
  name: string;
  settings?: Json;
  slug: string;
};

type ProfileRow = AuditColumns & {
  active: boolean;
  email: string;
  full_name: string;
  id: string;
  organization_id: string;
  phone: string | null;
  role: Database["public"]["Enums"]["user_role"];
};

type ProfileInsert = AuditInsert & {
  active?: boolean;
  email: string;
  full_name: string;
  id: string;
  organization_id: string;
  phone?: string | null;
  role?: Database["public"]["Enums"]["user_role"];
};

type TerritoryRow = AuditColumns & {
  assigned_employee_id: string | null;
  completed_streets: number;
  estimated_houses: number;
  houses_knocked: number;
  id: string;
  imported_streets_at: string | null;
  last_visited_at: string | null;
  name: string;
  organization_id: string;
  polygon_geojson: Json;
  progress_percent: number;
  recommended_revisit_date: string | null;
  revenue_total: number;
  status: Database["public"]["Enums"]["territory_status"];
  total_streets: number;
};

type TerritoryInsert = AuditInsert & {
  assigned_employee_id?: string | null;
  completed_streets?: number;
  estimated_houses?: number;
  houses_knocked?: number;
  id?: string;
  imported_streets_at?: string | null;
  last_visited_at?: string | null;
  name: string;
  organization_id: string;
  polygon_geojson: Json;
  progress_percent?: number;
  recommended_revisit_date?: string | null;
  revenue_total?: number;
  status?: Database["public"]["Enums"]["territory_status"];
  total_streets?: number;
};

type StreetRow = AuditColumns & {
  assigned_employee_id: string | null;
  completion_percent: number;
  estimated_houses: number;
  geometry_geojson: Json;
  houses_knocked: number;
  id: string;
  last_knock_date: string | null;
  name: string;
  next_recommended_revisit_date: string | null;
  notes: string | null;
  organization_id: string;
  osm_way_id: number | null;
  status: Database["public"]["Enums"]["street_status"];
  territory_id: string;
};

type StreetInsert = AuditInsert & {
  assigned_employee_id?: string | null;
  completion_percent?: number;
  estimated_houses?: number;
  geometry_geojson: Json;
  houses_knocked?: number;
  id?: string;
  last_knock_date?: string | null;
  name: string;
  next_recommended_revisit_date?: string | null;
  notes?: string | null;
  organization_id: string;
  osm_way_id?: number | null;
  status?: Database["public"]["Enums"]["street_status"];
  territory_id: string;
};

type CustomerRow = AuditColumns & {
  address: string | null;
  do_not_contact: boolean;
  email: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  notes: string | null;
  organization_id: string;
  phone: string | null;
  preferred_interval_days: number | null;
  preferred_service_type: Database["public"]["Enums"]["service_type"];
  street_id: string | null;
  territory_id: string | null;
};

type CustomerInsert = AuditInsert & {
  address?: string | null;
  do_not_contact?: boolean;
  email?: string | null;
  id?: string;
  latitude?: number | null;
  longitude?: number | null;
  name: string;
  notes?: string | null;
  organization_id: string;
  phone?: string | null;
  preferred_interval_days?: number | null;
  preferred_service_type?: Database["public"]["Enums"]["service_type"];
  street_id?: string | null;
  territory_id?: string | null;
};

type FeedbackRow = {
  id: string;
  organization_id: string;
  type: "bug" | "idea" | "confusing" | "urgent";
  page_area: string;
  description: string;
  screenshot_note: string | null;
  submitted_by: string | null;
  created_at: string;
};

type FeedbackInsert = {
  id?: string;
  organization_id: string;
  type: "bug" | "idea" | "confusing" | "urgent";
  page_area: string;
  description: string;
  screenshot_note?: string | null;
  submitted_by?: string | null;
  created_at?: string;
};

type LeadRow = AuditColumns & {
  address: string | null;
  after_photo_urls: string[];
  assigned_employee_id: string | null;
  before_photo_urls: string[];
  customer_id: string | null;
  customer_name: string;
  email: string | null;
  follow_up_date: string | null;
  id: string;
  internal_comments: string | null;
  job_status: Database["public"]["Enums"]["job_status"];
  latitude: number | null;
  lead_source: string;
  longitude: number | null;
  notes: string | null;
  organization_id: string;
  phone: string | null;
  quote_amount: number | null;
  requested_service: string | null;
  status: Database["public"]["Enums"]["lead_status"];
  street_id: string | null;
  territory_id: string | null;
};

type LeadInsert = AuditInsert & {
  address?: string | null;
  after_photo_urls?: string[];
  assigned_employee_id?: string | null;
  before_photo_urls?: string[];
  customer_id?: string | null;
  customer_name: string;
  email?: string | null;
  follow_up_date?: string | null;
  id?: string;
  internal_comments?: string | null;
  job_status?: Database["public"]["Enums"]["job_status"];
  latitude?: number | null;
  lead_source?: string;
  longitude?: number | null;
  notes?: string | null;
  organization_id: string;
  phone?: string | null;
  quote_amount?: number | null;
  requested_service?: string | null;
  status?: Database["public"]["Enums"]["lead_status"];
  street_id?: string | null;
  territory_id?: string | null;
};

type JobRow = AuditColumns & {
  assigned_employee_id: string | null;
  completed_at: string | null;
  customer_id: string | null;
  id: string;
  lead_id: string | null;
  next_service_due_at: string | null;
  notes: string | null;
  organization_id: string;
  quote_amount: number | null;
  recurrence_interval_days: number | null;
  revenue: number;
  scheduled_at: string | null;
  service_type: Database["public"]["Enums"]["service_type"];
  status: Database["public"]["Enums"]["job_status"];
  street_id: string | null;
  territory_id: string | null;
};

type JobInsert = AuditInsert & {
  assigned_employee_id?: string | null;
  completed_at?: string | null;
  customer_id?: string | null;
  id?: string;
  lead_id?: string | null;
  next_service_due_at?: string | null;
  notes?: string | null;
  organization_id: string;
  quote_amount?: number | null;
  recurrence_interval_days?: number | null;
  revenue?: number;
  scheduled_at?: string | null;
  service_type?: Database["public"]["Enums"]["service_type"];
  status?: Database["public"]["Enums"]["job_status"];
  street_id?: string | null;
  territory_id?: string | null;
};

type FollowUpRow = AuditColumns & {
  assigned_employee_id: string | null;
  completed_at: string | null;
  customer_id: string | null;
  due_at: string;
  id: string;
  job_id: string | null;
  lead_id: string | null;
  notes: string | null;
  organization_id: string;
  reason: string | null;
  status: Database["public"]["Enums"]["follow_up_status"];
};

type FollowUpInsert = AuditInsert & {
  assigned_employee_id?: string | null;
  completed_at?: string | null;
  customer_id?: string | null;
  due_at: string;
  id?: string;
  job_id?: string | null;
  lead_id?: string | null;
  notes?: string | null;
  organization_id: string;
  reason?: string | null;
  status?: Database["public"]["Enums"]["follow_up_status"];
};

type KnockingSessionRow = AuditColumns & {
  employee_id: string;
  ended_at: string | null;
  gps_path_geojson: Json | null;
  houses_knocked: number;
  id: string;
  jobs_booked: number;
  leads_created: number;
  notes: string | null;
  organization_id: string;
  quotes_created: number;
  revenue_booked: number;
  started_at: string;
  status: Database["public"]["Enums"]["session_status"];
  territory_id: string | null;
};

type KnockingSessionInsert = AuditInsert & {
  employee_id: string;
  ended_at?: string | null;
  gps_path_geojson?: Json | null;
  houses_knocked?: number;
  id?: string;
  jobs_booked?: number;
  leads_created?: number;
  notes?: string | null;
  organization_id: string;
  quotes_created?: number;
  revenue_booked?: number;
  started_at?: string;
  status?: Database["public"]["Enums"]["session_status"];
  territory_id?: string | null;
};

type StreetLockRow = AuditColumns & {
  employee_id: string;
  expires_at: string;
  id: string;
  locked_at: string;
  organization_id: string;
  override_reason: string | null;
  released_at: string | null;
  released_by: string | null;
  street_id: string;
};

type StreetLockInsert = AuditInsert & {
  employee_id: string;
  expires_at: string;
  id?: string;
  locked_at?: string;
  organization_id: string;
  override_reason?: string | null;
  released_at?: string | null;
  released_by?: string | null;
  street_id: string;
};
