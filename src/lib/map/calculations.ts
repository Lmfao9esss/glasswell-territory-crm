import { streetStatusLabels } from "@/lib/map/colors";
import type {
  LeadRow,
  ProfileRow,
  StreetLockState,
  StreetRow,
  TerritoryRow,
} from "@/lib/map/types";

export type TerritoryMetrics = {
  progressPercent: number;
  completedStreets: number;
  totalTrackableStreets: number;
  leadCount: number;
  quoteCount: number;
  bookedJobCount: number;
  revenue: number;
};

export function calculateTerritoryMetrics(
  territory: TerritoryRow,
  streets: StreetRow[],
  leads: LeadRow[],
): TerritoryMetrics {
  const territoryStreets = streets.filter(
    (street) => street.territory_id === territory.id,
  );
  const trackableStreets = territoryStreets.filter(
    (street) => street.status !== "do_not_knock",
  );
  const completedStreets = trackableStreets.filter(
    (street) => street.status === "completed",
  ).length;
  const territoryLeads = leads.filter((lead) => lead.territory_id === territory.id);
  const progressPercent = trackableStreets.length
    ? Math.round((completedStreets / trackableStreets.length) * 100)
    : 0;

  return {
    progressPercent,
    completedStreets,
    totalTrackableStreets: trackableStreets.length,
    leadCount: territoryLeads.length,
    quoteCount: territoryLeads.filter((lead) => lead.quote_amount !== null).length,
    bookedJobCount: territoryLeads.filter((lead) =>
      ["booked", "completed"].includes(lead.job_status),
    ).length,
    revenue: territory.revenue_total,
  };
}

export function getActiveLock(streetId: string, locks: StreetLockState[]) {
  return locks.find((lock) => lock.streetId === streetId && lock.releasedAt === null);
}

export function getLockDisplay(
  street: StreetRow,
  locks: StreetLockState[],
  employees: Map<string, ProfileRow>,
) {
  const lock = getActiveLock(street.id, locks);

  if (!lock) {
    return { label: "Available", tone: "bg-emerald-100 text-emerald-800" };
  }

  const employee = employees.get(lock.employeeId);
  const expired = new Date(lock.expiresAt).getTime() < Date.now();

  if (expired) {
    return { label: "Expired lock", tone: "bg-amber-100 text-amber-900" };
  }

  if (employee?.role === "employee") {
    return {
      label: "You are working this",
      tone: "bg-blue-100 text-blue-800",
    };
  }

  return {
    label: `Locked by ${employee?.full_name ?? "employee"}`,
    tone: "bg-zinc-200 text-zinc-800",
  };
}

export function findNearestTerritory(
  territories: TerritoryRow[],
  latitude: number,
) {
  if (!territories.length) return null;

  return latitude >= 45.428 ? territories[0] : territories[1] ?? territories[0];
}

export function findNearestStreet(streets: StreetRow[], territoryId?: string) {
  return streets.find((street) => street.territory_id === territoryId) ?? streets[0];
}

export function firstStreetCoordinate(street: StreetRow) {
  const geometry = street.geometry_geojson as {
    coordinates?: unknown;
  };
  const coordinates = geometry.coordinates;

  if (
    Array.isArray(coordinates) &&
    Array.isArray(coordinates[0]) &&
    typeof coordinates[0][0] === "number" &&
    typeof coordinates[0][1] === "number"
  ) {
    return {
      longitude: coordinates[0][0] as number,
      latitude: coordinates[0][1] as number,
    };
  }

  return null;
}

export function streetStatusChangeAction(status: StreetRow["status"]) {
  if (status === "completed") return "street_completed";
  if (status === "skipped") return "street_skipped";
  if (status === "do_not_knock") return "street_do_not_knock";
  return "street_started";
}

export function streetStatusChangeMessage(street: StreetRow) {
  return `${street.name} marked ${streetStatusLabels[street.status]}`;
}
