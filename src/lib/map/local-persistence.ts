import type { LocalMapSnapshot, MapData } from "@/lib/map/types";

const LOCAL_DATA_KEY = "glasswell.field-map.v1";
export const LOCAL_MAP_SCHEMA_VERSION = 1;

type PersistedEnvelope = {
  schemaVersion: number;
  savedAt: string;
  snapshot: LocalMapSnapshot;
};

type LoadResult =
  | { ok: true; snapshot: LocalMapSnapshot | null; migrated: boolean }
  | { ok: false; snapshot: null; error: string };

export function loadLocalSnapshot(): LoadResult {
  if (typeof window === "undefined") {
    return { ok: true, snapshot: null, migrated: false };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DATA_KEY);
    if (!raw) return { ok: true, snapshot: null, migrated: false };

    const envelope = JSON.parse(raw) as Partial<PersistedEnvelope>;
    if (envelope.schemaVersion !== LOCAL_MAP_SCHEMA_VERSION) {
      window.localStorage.removeItem(LOCAL_DATA_KEY);
      return { ok: true, snapshot: null, migrated: true };
    }
    if (!envelope.snapshot || !isValidSnapshot(envelope.snapshot)) {
      window.localStorage.removeItem(LOCAL_DATA_KEY);
      return {
        ok: false,
        snapshot: null,
        error: "Saved demo data was invalid and has been reset.",
      };
    }

    return { ok: true, snapshot: envelope.snapshot, migrated: false };
  } catch {
    window.localStorage.removeItem(LOCAL_DATA_KEY);
    return {
      ok: false,
      snapshot: null,
      error: "Saved demo data could not be read and has been reset.",
    };
  }
}

export function saveLocalSnapshot(snapshot: LocalMapSnapshot) {
  if (typeof window === "undefined") return;

  const envelope: PersistedEnvelope = {
    schemaVersion: LOCAL_MAP_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    snapshot,
  };
  window.localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(envelope));
}

export function clearLocalSnapshot() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(LOCAL_DATA_KEY);
}

export function exportLocalSnapshot(snapshot: LocalMapSnapshot) {
  const envelope: PersistedEnvelope = {
    schemaVersion: LOCAL_MAP_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    snapshot,
  };

  return JSON.stringify(envelope, null, 2);
}

export function parseImportedSnapshot(raw: string): LocalMapSnapshot {
  const envelope = JSON.parse(raw) as Partial<PersistedEnvelope>;

  if (envelope.schemaVersion !== LOCAL_MAP_SCHEMA_VERSION) {
    throw new Error("Backup schema version is not supported.");
  }
  if (!envelope.snapshot || !isValidSnapshot(envelope.snapshot)) {
    throw new Error("Backup file does not contain valid map data.");
  }

  return envelope.snapshot;
}

function isValidSnapshot(snapshot: Partial<LocalMapSnapshot>) {
  return (
    isValidMapData(snapshot.mapData) &&
    Array.isArray(snapshot.streetLocks) &&
    Array.isArray(snapshot.activities) &&
    Array.isArray(snapshot.timelineItems) &&
    (snapshot.shift === null || typeof snapshot.shift === "object") &&
    (snapshot.activeStreetId === null ||
      typeof snapshot.activeStreetId === "string") &&
    (snapshot.streetStartedAt === null ||
      typeof snapshot.streetStartedAt === "string")
  );
}

function isValidMapData(mapData: Partial<MapData> | undefined) {
  return Boolean(
    mapData &&
      mapData.organization &&
      Array.isArray(mapData.employees) &&
      Array.isArray(mapData.territories) &&
      Array.isArray(mapData.streets) &&
      Array.isArray(mapData.leads) &&
      Array.isArray(mapData.customers) &&
      Array.isArray(mapData.jobs) &&
      Array.isArray(mapData.followUps),
  );
}
