import type {
  ActivityLogRow,
  CustomerRow,
  FollowUpRow,
  JobRow,
  KnockingSessionRow,
  LeadRow,
  MapData,
  ProfileRow,
  StreetLockRow,
  StreetRow,
  TerritoryRow,
} from "@/lib/map/types";
import { mockMapData } from "@/lib/map/mock-data";
import type { TerritorySetupSaveInput } from "@/lib/map/territory-setup";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/db/database.types";
import { measureAsync } from "@/lib/observability/performance-monitor";

export type TerritoryRepository = {
  listTerritories(): Promise<TerritoryRow[]>;
  saveTerritorySetup(input: TerritorySetupSaveInput): Promise<TerritorySetupSaveInput>;
};

export type StreetRepository = {
  listStreets(): Promise<StreetRow[]>;
};

export type LeadRepository = {
  listLeads(): Promise<LeadRow[]>;
};

export type CustomerRepository = {
  listCustomers(): Promise<CustomerRow[]>;
};

export type JobRepository = {
  listJobs(): Promise<JobRow[]>;
};

export type FollowUpRepository = {
  listFollowUps(): Promise<FollowUpRow[]>;
};

export type EmployeeRepository = {
  listEmployees(): Promise<ProfileRow[]>;
};
export type ActivityLogRepository = {
  listActivityLog(): Promise<ActivityLogRow[]>;
};

export type KnockingSessionRepository = {
  listKnockingSessions(): Promise<KnockingSessionRow[]>;
};

export type StreetLockRepository = {
  listStreetLocks(): Promise<StreetLockRow[]>;
};

export type MapDataRepository = TerritoryRepository &
  StreetRepository &
  LeadRepository &
  CustomerRepository &
  JobRepository &
  FollowUpRepository &
  EmployeeRepository &
  ActivityLogRepository &
  KnockingSessionRepository &
  StreetLockRepository & {
    loadMapData(): Promise<MapData>;
  };

type SupabaseInsertTable = {
  insert(values: unknown): Promise<{ error: Error | null }>;
};

export function createMockMapDataRepository(): MapDataRepository {
  return {
    async listTerritories() {
      return [...mockMapData.territories];
    },
    async saveTerritorySetup(input) {
      return input;
    },
    async listStreets() {
      return [...mockMapData.streets];
    },
    async listLeads() {
      return [...mockMapData.leads];
    },
    async listCustomers() {
      return [...mockMapData.customers];
    },
    async listJobs() {
      return [...mockMapData.jobs];
    },
    async listFollowUps() {
      return [...mockMapData.followUps];
    },
    async listEmployees() {
      return [...mockMapData.employees];
    },
    async listActivityLog() {
      return [];
    },
    async listKnockingSessions() {
      return [];
    },
    async listStreetLocks() {
      return [];
    },
    async loadMapData() {
      return {
        organization: mockMapData.organization,
        employees: [...mockMapData.employees],
        territories: [...mockMapData.territories],
        streets: [...mockMapData.streets],
        leads: [...mockMapData.leads],
        customers: [...mockMapData.customers],
        jobs: [...mockMapData.jobs],
        followUps: [...mockMapData.followUps],
      };
    },
  };
}

export function createSupabaseMapDataRepository(): MapDataRepository {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase is not configured. Demo Mode is available.");
  }
  const supabase = client;

  async function selectAll(table: keyof Database["public"]["Tables"]) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return data ?? [];
  }

  return {
    async listTerritories() {
      return (await selectAll("territories")) as TerritoryRow[];
    },
    async saveTerritorySetup(input) {
      const territoriesTable = supabase.from(
        "territories",
      ) as unknown as SupabaseInsertTable;
      const streetsTable = supabase.from(
        "streets",
      ) as unknown as SupabaseInsertTable;
      const { error: territoryError } = await territoriesTable.insert([
        input.territory,
      ]);
      if (territoryError) throw territoryError;

      if (input.streets.length) {
        const { error: streetsError } = await streetsTable.insert(input.streets);
        if (streetsError) throw streetsError;
      }

      return input;
    },
    async listStreets() {
      return (await selectAll("streets")) as StreetRow[];
    },
    async listLeads() {
      return (await selectAll("leads")) as LeadRow[];
    },
    async listCustomers() {
      return (await selectAll("customers")) as CustomerRow[];
    },
    async listJobs() {
      return (await selectAll("jobs")) as JobRow[];
    },
    async listFollowUps() {
      return (await selectAll("follow_ups")) as FollowUpRow[];
    },
    async listEmployees() {
      return (await selectAll("profiles")) as ProfileRow[];
    },
    async listActivityLog() {
      return (await selectAll("activity_log")) as ActivityLogRow[];
    },
    async listKnockingSessions() {
      return (await selectAll("knocking_sessions")) as KnockingSessionRow[];
    },
    async listStreetLocks() {
      return (await selectAll("street_locks")) as StreetLockRow[];
    },
    async loadMapData() {
      const [
        employees,
        territories,
        streets,
        leads,
        customers,
        jobs,
        followUps,
      ] = await Promise.all([
        this.listEmployees(),
        this.listTerritories(),
        this.listStreets(),
        this.listLeads(),
        this.listCustomers(),
        this.listJobs(),
        this.listFollowUps(),
      ]);
      const organizationId =
        employees[0]?.organization_id ??
        territories[0]?.organization_id ??
        leads[0]?.organization_id;

      if (!organizationId) {
        throw new Error("No organization data is available for this profile.");
      }

      const { data: organization, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (error) throw error;

      return {
        organization,
        employees,
        territories,
        streets,
        leads,
        customers,
        jobs,
        followUps,
      };
    },
  };
}

export function createMapDataRepository(mode: "demo" | "cloud" = "demo") {
  const repository =
    mode === "cloud"
    ? createSupabaseMapDataRepository()
    : createMockMapDataRepository();

  return instrumentRepository(repository, mode);
}

function instrumentRepository(
  repository: MapDataRepository,
  mode: "demo" | "cloud",
): MapDataRepository {
  return {
    async listTerritories() {
      return measureRepository(mode, "listTerritories", () =>
        repository.listTerritories(),
      );
    },
    async saveTerritorySetup(input) {
      return measureRepository(mode, "saveTerritorySetup", () =>
        repository.saveTerritorySetup(input),
      );
    },
    async listStreets() {
      return measureRepository(mode, "listStreets", () => repository.listStreets());
    },
    async listLeads() {
      return measureRepository(mode, "listLeads", () => repository.listLeads());
    },
    async listCustomers() {
      return measureRepository(mode, "listCustomers", () =>
        repository.listCustomers(),
      );
    },
    async listJobs() {
      return measureRepository(mode, "listJobs", () => repository.listJobs());
    },
    async listFollowUps() {
      return measureRepository(mode, "listFollowUps", () =>
        repository.listFollowUps(),
      );
    },
    async listEmployees() {
      return measureRepository(mode, "listEmployees", () =>
        repository.listEmployees(),
      );
    },
    async listActivityLog() {
      return measureRepository(mode, "listActivityLog", () =>
        repository.listActivityLog(),
      );
    },
    async listKnockingSessions() {
      return measureRepository(mode, "listKnockingSessions", () =>
        repository.listKnockingSessions(),
      );
    },
    async listStreetLocks() {
      return measureRepository(mode, "listStreetLocks", () =>
        repository.listStreetLocks(),
      );
    },
    async loadMapData() {
      return measureRepository(mode, "loadMapData", () => repository.loadMapData());
    },
  };
}

function measureRepository<T>(
  mode: "demo" | "cloud",
  operation: string,
  callback: () => Promise<T>,
) {
  return measureAsync(
    "repository.operation",
    {
      mode,
      operation,
    },
    callback,
  );
}
