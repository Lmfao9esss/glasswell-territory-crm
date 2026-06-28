import type { Json } from "@/lib/db/database.types";
import type {
  CustomerRow,
  FollowUpRow,
  JobRow,
  LeadRow,
  ProfileRow,
  StreetLockState,
  StreetRow,
  TerritoryRow,
} from "@/lib/map/types";

type GeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteRelatedEntity =
  | { type: "lead"; id: string; label: string }
  | { type: "customer"; id: string; label: string };

export type RouteStep = {
  street: StreetRow;
  score: number;
  distanceMeters: number | null;
  reasons: string[];
  relatedEntities: RouteRelatedEntity[];
  center: RoutePoint | null;
};

export type RoutePlan = {
  territory: TerritoryRow;
  steps: RouteStep[];
  generatedAt: string;
};

export function planEmployeeRoute(input: {
  territory: TerritoryRow | null;
  employee: ProfileRow | null;
  streets: StreetRow[];
  leads: LeadRow[];
  customers: CustomerRow[];
  jobs: JobRow[];
  followUps: FollowUpRow[];
  locks: StreetLockState[];
  currentLocation: RoutePoint | null;
  now?: Date;
}): RoutePlan | null {
  if (!input.territory || !input.employee) return null;
  const territory = input.territory;
  const employee = input.employee;

  const todayKey = (input.now ?? new Date()).toISOString().slice(0, 10);
  const territoryStreets = input.streets.filter(
    (street) => street.territory_id === territory.id,
  );
  const routeableStreets = territoryStreets.filter(
    (street) =>
      street.status !== "completed" &&
      street.status !== "do_not_knock" &&
      !isLockedByOtherEmployee(street.id, input.employee?.id, input.locks),
  );

  const steps = routeableStreets
    .map((street) =>
      scoreStreet({
        street,
        employee,
        leads: input.leads,
        customers: input.customers,
        jobs: input.jobs,
        followUps: input.followUps,
        currentLocation: input.currentLocation,
        todayKey,
      }),
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        (b.distanceMeters ?? Number.MAX_SAFE_INTEGER);
    });

  return {
    territory: input.territory,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

export function routeLineCoordinates(plan: RoutePlan | null) {
  if (!plan) return [];

  return plan.steps
    .map((step) => step.center)
    .filter((point): point is RoutePoint => Boolean(point))
    .map((point) => [point.latitude, point.longitude] as [number, number]);
}

export function streetCenter(street: StreetRow): RoutePoint | null {
  const line = asLine(street.geometry_geojson);
  if (!line || !line.coordinates.length) return null;

  const totals = line.coordinates.reduce(
    (sum, [longitude, latitude]) => ({
      longitude: sum.longitude + longitude,
      latitude: sum.latitude + latitude,
    }),
    { longitude: 0, latitude: 0 },
  );

  return {
    latitude: totals.latitude / line.coordinates.length,
    longitude: totals.longitude / line.coordinates.length,
  };
}

export function formatDistance(meters: number | null) {
  if (meters === null) return "Distance unavailable";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function scoreStreet(input: {
  street: StreetRow;
  employee: ProfileRow;
  leads: LeadRow[];
  customers: CustomerRow[];
  jobs: JobRow[];
  followUps: FollowUpRow[];
  currentLocation: RoutePoint | null;
  todayKey: string;
}): RouteStep {
  const center = streetCenter(input.street);
  const distanceMeters =
    center && input.currentLocation
      ? distanceBetween(input.currentLocation, center)
      : null;
  const streetLeads = input.leads.filter(
    (lead) => lead.street_id === input.street.id,
  );
  const streetCustomers = input.customers.filter(
    (customer) => customer.street_id === input.street.id,
  );
  const streetJobs = input.jobs.filter((job) => job.street_id === input.street.id);
  const streetFollowUps = input.followUps.filter((followUp) =>
    isFollowUpForStreet(followUp, streetLeads, streetCustomers),
  );
  const overdueFollowUps = streetFollowUps.filter(
    (followUp) =>
      followUp.status === "open" && followUp.due_at.slice(0, 10) < input.todayKey,
  );
  const pendingQuotes = streetLeads.filter(
    (lead) =>
      lead.quote_amount !== null &&
      (lead.status === "quoted" ||
        lead.status === "waiting" ||
        lead.job_status === "quoted"),
  );
  const bookedJobs = streetJobs.filter((job) => job.status === "booked");
  const reasons: string[] = ["Unfinished street"];
  const relatedEntities: RouteRelatedEntity[] = [];
  let score = 25;

  if (input.street.assigned_employee_id === input.employee.id) {
    score += 15;
    reasons.push("Assigned to you");
  }
  if (overdueFollowUps.length) {
    score += 30;
    reasons.push("Overdue follow-up nearby");
    relatedEntities.push(
      ...overdueFollowUps.flatMap((followUp) =>
        relatedEntityForFollowUp(followUp, streetLeads, streetCustomers),
      ),
    );
  }
  if (pendingQuotes.length) {
    const highQuote = pendingQuotes.some((lead) => (lead.quote_amount ?? 0) >= 300);
    score += highQuote ? 25 : 18;
    reasons.push(highQuote ? "High pending quote nearby" : "Pending quote nearby");
    relatedEntities.push(
      ...pendingQuotes.map((lead) => ({
        type: "lead" as const,
        id: lead.id,
        label: lead.customer_name,
      })),
    );
  }
  if (bookedJobs.length) {
    score += 20;
    reasons.push("Booked job nearby");
  }
  if (distanceMeters !== null) {
    score += Math.max(0, 20 - Math.round(distanceMeters / 75));
    if (distanceMeters < 250) reasons.push("Closest unfinished street");
  }
  if (input.street.status === "skipped") {
    score -= 8;
    reasons.push("Previously skipped");
  }

  return {
    street: input.street,
    score,
    distanceMeters,
    reasons: unique(reasons),
    relatedEntities: uniqueRelated(relatedEntities),
    center,
  };
}

function isLockedByOtherEmployee(
  streetId: string,
  employeeId: string | undefined,
  locks: StreetLockState[],
) {
  const activeLock = locks.find(
    (lock) => lock.streetId === streetId && lock.releasedAt === null,
  );

  return Boolean(activeLock && activeLock.employeeId !== employeeId);
}

function isFollowUpForStreet(
  followUp: FollowUpRow,
  leads: LeadRow[],
  customers: CustomerRow[],
) {
  return (
    (followUp.lead_id !== null &&
      leads.some((lead) => lead.id === followUp.lead_id)) ||
    (followUp.customer_id !== null &&
      customers.some((customer) => customer.id === followUp.customer_id))
  );
}

function relatedEntityForFollowUp(
  followUp: FollowUpRow,
  leads: LeadRow[],
  customers: CustomerRow[],
): RouteRelatedEntity[] {
  const lead = leads.find((item) => item.id === followUp.lead_id);
  if (lead) return [{ type: "lead", id: lead.id, label: lead.customer_name }];

  const customer = customers.find((item) => item.id === followUp.customer_id);
  if (customer) return [{ type: "customer", id: customer.id, label: customer.name }];

  return [];
}

function distanceBetween(a: RoutePoint, b: RoutePoint) {
  const latMeters = (b.latitude - a.latitude) * 111_320;
  const lngMeters =
    (b.longitude - a.longitude) *
    111_320 *
    Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));

  return Math.sqrt(latMeters * latMeters + lngMeters * lngMeters);
}

function asLine(value: Json): GeoJsonLineString | null {
  const line = value as Partial<GeoJsonLineString>;
  if (
    line.type !== "LineString" ||
    !Array.isArray(line.coordinates) ||
    line.coordinates.length < 2
  ) {
    return null;
  }

  return line as GeoJsonLineString;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function uniqueRelated(values: RouteRelatedEntity[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.type}:${value.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
