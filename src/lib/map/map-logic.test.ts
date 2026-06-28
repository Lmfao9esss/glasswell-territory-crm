import { describe, expect, it } from "vitest";

import { calculateTerritoryMetrics } from "@/lib/map/calculations";
import { streetStatusColors, territoryColorByCompletion } from "@/lib/map/colors";
import {
  exportLocalSnapshot,
  parseImportedSnapshot,
} from "@/lib/map/local-persistence";
import { mockMapData } from "@/lib/map/mock-data";
import { planEmployeeRoute } from "@/lib/map/route-planning";
import type { LocalMapSnapshot, StreetLockState } from "@/lib/map/types";

describe("map pure logic", () => {
  it("calculates territory progress from completed trackable streets", () => {
    const territory = mockMapData.territories[0];
    const metrics = calculateTerritoryMetrics(
      territory,
      mockMapData.streets,
      mockMapData.leads,
    );

    expect(metrics.completedStreets).toBe(1);
    expect(metrics.totalTrackableStreets).toBe(3);
    expect(metrics.progressPercent).toBe(33);
  });

  it("maps status colors consistently", () => {
    expect(streetStatusColors.not_knocked).toBe("#dc2626");
    expect(streetStatusColors.completed).toBe("#16a34a");
    expect(territoryColorByCompletion(0)).toBe("#dc2626");
    expect(territoryColorByCompletion(60)).toBe("#eab308");
    expect(territoryColorByCompletion(100)).toBe("#166534");
  });

  it("scores routes while excluding completed streets and locks owned by others", () => {
    const employee = mockMapData.employees.find((item) => item.role === "employee");
    const territory = mockMapData.territories[0];
    const lockedStreet = mockMapData.streets.find(
      (street) => street.name === "Marier Avenue",
    );
    const otherEmployee = mockMapData.employees.find(
      (item) => item.role === "manager",
    );
    const locks: StreetLockState[] =
      lockedStreet && otherEmployee
        ? [
            {
              id: "lock-test",
              streetId: lockedStreet.id,
              employeeId: otherEmployee.id,
              lockedAt: "2026-06-27T12:00:00.000Z",
              expiresAt: "2026-06-27T16:00:00.000Z",
              releasedAt: null,
              releasedBy: null,
              overrideReason: null,
            },
          ]
        : [];

    const plan = planEmployeeRoute({
      territory,
      employee: employee ?? null,
      streets: mockMapData.streets,
      leads: mockMapData.leads,
      customers: mockMapData.customers,
      jobs: mockMapData.jobs,
      followUps: mockMapData.followUps,
      locks,
      currentLocation: { latitude: 45.4365, longitude: -75.6621 },
      now: new Date("2026-06-29T12:00:00.000Z"),
    });

    expect(plan?.steps.map((step) => step.street.name)).not.toContain(
      "Lafontaine Avenue",
    );
    expect(plan?.steps.map((step) => step.street.name)).not.toContain(
      "Marier Avenue",
    );
    expect(plan?.steps[0]?.reasons).toContain("Overdue follow-up nearby");
  });

  it("validates local backup envelopes", () => {
    const snapshot: LocalMapSnapshot = {
      mapData: mockMapData,
      streetLocks: [],
      activities: [],
      timelineItems: [],
      shift: null,
      activeStreetId: null,
      streetStartedAt: null,
    };

    expect(parseImportedSnapshot(exportLocalSnapshot(snapshot)).mapData).toEqual(
      mockMapData,
    );
    expect(() => parseImportedSnapshot("{\"schemaVersion\":999}")).toThrow(
      "Backup schema version is not supported.",
    );
  });
});
