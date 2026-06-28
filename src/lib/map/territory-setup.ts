import type { Json } from "@/lib/db/database.types";
import type { ProfileRow, StreetRow, TerritoryRow } from "@/lib/map/types";

export type TerritorySetupPreset = {
  id: string;
  name: string;
  polygon: Json;
};

export type ImportedStreetPreview = {
  importId: string;
  name: string;
  geometry_geojson: Json;
  osm_way_id: number | null;
  estimated_houses: number;
  duplicateStreetId: string | null;
  selected: boolean;
  source: "overpass" | "mock" | "manual";
};

export type TerritorySetupDraft = {
  name: string;
  assignedEmployeeId: string;
  presetId: string;
  polygon: Json;
};

export type TerritorySetupSaveInput = {
  territory: TerritoryRow;
  streets: StreetRow[];
};

export const territorySetupPresets: TerritorySetupPreset[] = [
  {
    id: "vanier-demo-east",
    name: "Vanier East Demo",
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [-75.6554, 45.4327],
          [-75.6425, 45.4295],
          [-75.6452, 45.4214],
          [-75.6616, 45.4242],
          [-75.6554, 45.4327],
        ],
      ],
    },
  },
  {
    id: "overbrook-demo",
    name: "Overbrook Demo",
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [-75.6661, 45.4304],
          [-75.6535, 45.4274],
          [-75.6572, 45.4187],
          [-75.6721, 45.4215],
          [-75.6661, 45.4304],
        ],
      ],
    },
  },
  {
    id: "westboro-demo",
    name: "Westboro Demo",
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [-75.7644, 45.3977],
          [-75.7467, 45.394],
          [-75.7505, 45.3843],
          [-75.7704, 45.3883],
          [-75.7644, 45.3977],
        ],
      ],
    },
  },
];

export function createTerritoryRow(input: {
  organizationId: string;
  name: string;
  polygon: Json;
  assignedEmployeeId: string | null;
  actorId: string | null;
  streets: ImportedStreetPreview[];
}): TerritoryRow {
  const now = new Date().toISOString();
  const selectedStreets = input.streets.filter((street) => street.selected);
  const estimatedHouses = selectedStreets.reduce(
    (sum, street) => sum + street.estimated_houses,
    0,
  );

  return {
    id: crypto.randomUUID(),
    organization_id: input.organizationId,
    name: input.name.trim(),
    polygon_geojson: input.polygon,
    assigned_employee_id: input.assignedEmployeeId,
    status: "not_started",
    imported_streets_at: now,
    total_streets: selectedStreets.length,
    completed_streets: 0,
    estimated_houses: estimatedHouses,
    houses_knocked: 0,
    progress_percent: 0,
    revenue_total: 0,
    last_visited_at: null,
    recommended_revisit_date: null,
    created_by: input.actorId,
    updated_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
}

export function createStreetRows(input: {
  organizationId: string;
  territoryId: string;
  assignedEmployeeId: string | null;
  actorId: string | null;
  streets: ImportedStreetPreview[];
}): StreetRow[] {
  const now = new Date().toISOString();

  return input.streets
    .filter((street) => street.selected && !street.duplicateStreetId)
    .map((street) => ({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      territory_id: input.territoryId,
      osm_way_id: street.osm_way_id,
      name: street.name,
      geometry_geojson: street.geometry_geojson,
      assigned_employee_id: input.assignedEmployeeId,
      status: "not_knocked",
      estimated_houses: street.estimated_houses,
      houses_knocked: 0,
      completion_percent: 0,
      last_knock_date: null,
      next_recommended_revisit_date: null,
      notes:
        street.source === "manual"
          ? "Manually added during territory setup."
          : `Imported from ${street.source === "overpass" ? "OpenStreetMap" : "demo import"}.`,
      created_by: input.actorId,
      updated_by: input.actorId,
      created_at: now,
      updated_at: now,
    }));
}

export function employeeOptions(employees: ProfileRow[]) {
  return employees.filter((employee) => employee.active);
}
