import type { Database } from "@/lib/db/database.types";

export type OrganizationRow =
  Database["public"]["Tables"]["organizations"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type TerritoryRow =
  Database["public"]["Tables"]["territories"]["Row"];
export type StreetRow = Database["public"]["Tables"]["streets"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];
export type ActivityLogRow = Database["public"]["Tables"]["activity_log"]["Row"];
export type KnockingSessionRow =
  Database["public"]["Tables"]["knocking_sessions"]["Row"];
export type StreetLockRow = Database["public"]["Tables"]["street_locks"]["Row"];

export type StreetStatus = Database["public"]["Enums"]["street_status"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type TerritoryStatus = Database["public"]["Enums"]["territory_status"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type FollowUpStatus = Database["public"]["Enums"]["follow_up_status"];
export type ServiceType = Database["public"]["Enums"]["service_type"];

export type MapData = {
  organization: OrganizationRow;
  employees: ProfileRow[];
  territories: TerritoryRow[];
  streets: StreetRow[];
  leads: LeadRow[];
  customers: CustomerRow[];
  jobs: JobRow[];
  followUps: FollowUpRow[];
};

export type MapFilters = {
  territoryId: string;
  streetStatus: StreetStatus | "all";
  leadStatus: LeadStatus | "all";
  employeeId: string;
};

export type SelectedMapEntity =
  | { type: "territory"; item: TerritoryRow }
  | { type: "street"; item: StreetRow }
  | { type: "lead"; item: LeadRow }
  | { type: "customer"; item: CustomerRow };

export type StreetLockState = {
  id: string;
  streetId: string;
  employeeId: string;
  lockedAt: string;
  expiresAt: string;
  releasedAt: string | null;
  releasedBy: string | null;
  overrideReason: string | null;
};

export type ActivityLogItem = {
  id: string;
  territoryId: string;
  streetId?: string;
  actorId: string;
  action:
    | "street_started"
    | "street_completed"
    | "street_skipped"
    | "street_do_not_knock"
    | "territory_assigned"
    | "territory_created"
    | "territory_renamed"
    | "territory_status_changed"
    | "lock_overridden"
    | "note_added"
    | "lead_created"
    | "lead_converted"
    | "follow_up_created"
    | "job_booked"
    | "lead_lost"
    | "photo_attached";
  message: string;
  createdAt: string;
};

export type TimelineItem = {
  id: string;
  customerId?: string;
  leadId?: string;
  jobId?: string;
  followUpId?: string;
  label: string;
  description: string;
  createdAt: string;
};

export type LeadDraft = {
  latitude: number;
  longitude: number;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  status: LeadStatus;
  quoteAmount: string;
  notes: string;
};

export type JobDraft = {
  subjectType: "lead" | "customer";
  subjectId: string;
  date: string;
  time: string;
  service: "residential" | "commercial" | "custom";
  price: string;
  assignedEmployeeId: string;
  notes: string;
};

export type FollowUpDraft = {
  subjectType: "lead" | "customer";
  subjectId: string;
  dueAt: string;
  label: string;
};

export type ShiftSession = {
  employeeId: string;
  territoryId: string | null;
  startedAt: string;
  endedAt: string | null;
  startLocation: { latitude: number; longitude: number } | null;
  housesKnocked: number;
  leads: number;
  quotes: number;
  jobsBooked: number;
  streetsCompleted: number;
  estimatedRevenue: number;
  notes: string;
};

export type QuickResult =
  | "no_answer"
  | "interested"
  | "quoted"
  | "booked"
  | "call_back"
  | "do_not_contact";

export type QuickLeadDraft = {
  streetId: string;
  result: QuickResult;
  phone: string;
  name: string;
  quote: string;
  notes: string;
};

export type LocalMapSnapshot = {
  mapData: MapData;
  streetLocks: StreetLockState[];
  activities: ActivityLogItem[];
  timelineItems: TimelineItem[];
  shift: ShiftSession | null;
  activeStreetId: string | null;
  streetStartedAt: string | null;
};

export type DataMode = "demo" | "cloud";

export type AuthProfileState = {
  isConfigured: boolean;
  userId: string | null;
  email: string | null;
  profile: ProfileRow | null;
  organization: OrganizationRow | null;
};
