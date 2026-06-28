import type { Json } from "@/lib/db/database.types";
import type { StreetRow } from "@/lib/map/types";
import type { ImportedStreetPreview } from "@/lib/map/territory-setup";

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

type GeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

type OverpassElement = {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

export type StreetImportResult = {
  streets: ImportedStreetPreview[];
  source: "overpass" | "mock";
  warning: string | null;
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const CACHE_PREFIX = "glasswell.osm-import.";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const doorKnockingHighways = new Set([
  "residential",
  "living_street",
  "service",
  "unclassified",
  "tertiary",
]);

export async function importStreetsForTerritory(input: {
  polygon: Json;
  existingStreets: StreetRow[];
}): Promise<StreetImportResult> {
  const polygon = asPolygon(input.polygon);
  if (!polygon) {
    throw new Error("Territory polygon is not valid.");
  }

  const cacheKey = `${CACHE_PREFIX}${stablePolygonKey(polygon)}`;
  const cached = readCachedImport(cacheKey);
  if (cached) {
    return {
      streets: markDuplicates(cached, input.existingStreets),
      source: cached.some((street) => street.source === "overpass")
        ? "overpass"
        : "mock",
      warning: "Using cached OSM import results to avoid repeated Overpass requests.",
    };
  }

  try {
    const overpassStreets = await fetchOverpassStreets(polygon);
    const normalized = normalizeImportedStreets(
      overpassStreets,
      input.existingStreets,
    );

    if (normalized.length > 0) {
      writeCachedImport(cacheKey, normalized);
      return {
        streets: normalized,
        source: "overpass",
        warning:
          "OpenStreetMap import uses the public Overpass API. Results are cached for 24 hours.",
      };
    }

    const fallback = createMockImportedStreets(polygon, input.existingStreets);
    writeCachedImport(cacheKey, fallback);
    return {
      streets: fallback,
      source: "mock",
      warning:
        "No usable OSM streets were returned. Demo import streets were generated for setup testing.",
    };
  } catch {
    const fallback = createMockImportedStreets(polygon, input.existingStreets);
    writeCachedImport(cacheKey, fallback);
    return {
      streets: fallback,
      source: "mock",
      warning:
        "OSM import could not be reached. Demo import streets were generated so setup can continue.",
    };
  }
}

export function mockImportStreetsForTerritory(input: {
  polygon: Json;
  existingStreets: StreetRow[];
}): StreetImportResult {
  const polygon = asPolygon(input.polygon);
  if (!polygon) {
    throw new Error("Territory polygon is not valid.");
  }

  return {
    streets: createMockImportedStreets(polygon, input.existingStreets),
    source: "mock",
    warning:
      "Demo street import created local test streets without calling OpenStreetMap.",
  };
}

export function createManualStreetPreview(input: {
  name: string;
  polygon: Json;
  estimatedHouses: number;
  existingStreets: StreetRow[];
}): ImportedStreetPreview {
  const polygon = asPolygon(input.polygon);
  const geometry = polygon
    ? createLineInsidePolygon(polygon, 0.5)
    : {
        type: "LineString",
        coordinates: [
          [-75.6972, 45.4215],
          [-75.6922, 45.4215],
        ],
      };
  const duplicate = findDuplicateStreet(
    input.name,
    null,
    input.existingStreets,
  );

  return {
    importId: `manual-${crypto.randomUUID()}`,
    name: input.name.trim(),
    geometry_geojson: geometry,
    osm_way_id: null,
    estimated_houses: Math.max(0, Math.round(input.estimatedHouses)),
    duplicateStreetId: duplicate?.id ?? null,
    selected: !duplicate,
    source: "manual",
  };
}

async function fetchOverpassStreets(
  polygon: GeoJsonPolygon,
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(polygon);
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) {
    throw new Error(`Overpass returned ${response.status}.`);
  }

  const payload = (await response.json()) as OverpassResponse;
  return payload.elements ?? [];
}

function buildOverpassQuery(polygon: GeoJsonPolygon) {
  const poly = polygon.coordinates[0]
    .map(([lng, lat]) => `${lat} ${lng}`)
    .join(" ");

  return `
    [out:json][timeout:18];
    way["highway"]["name"](poly:"${poly}");
    out geom;
  `;
}

function normalizeImportedStreets(
  elements: OverpassElement[],
  existingStreets: StreetRow[],
): ImportedStreetPreview[] {
  const byName = new Map<string, ImportedStreetPreview>();

  for (const element of elements) {
    const name = element.tags?.name?.trim();
    const highway = element.tags?.highway;
    const coordinates = element.geometry?.map(
      (point) => [point.lon, point.lat] as [number, number],
    );

    if (!name || !highway || !doorKnockingHighways.has(highway)) continue;
    if (!coordinates || coordinates.length < 2) continue;
    if (element.tags?.access === "private") continue;

    const existing = byName.get(nameKey(name));
    const geometry: GeoJsonLineString = {
      type: "LineString",
      coordinates,
    };

    if (existing) {
      existing.estimated_houses += estimateHousesForLine(geometry);
      continue;
    }

    const duplicate = findDuplicateStreet(name, element.id, existingStreets);
    byName.set(nameKey(name), {
      importId: `osm-${element.id}`,
      name,
      geometry_geojson: geometry,
      osm_way_id: element.id,
      estimated_houses: estimateHousesForLine(geometry),
      duplicateStreetId: duplicate?.id ?? null,
      selected: !duplicate,
      source: "overpass",
    });
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function createMockImportedStreets(
  polygon: GeoJsonPolygon,
  existingStreets: StreetRow[],
): ImportedStreetPreview[] {
  const names = [
    "Donald Street",
    "Stevens Avenue",
    "Prince Albert Street",
    "Queen Mary Street",
    "Alesther Street",
  ];

  return names.map((name, index) => {
    const duplicate = findDuplicateStreet(name, null, existingStreets);
    const geometry = createLineInsidePolygon(polygon, (index + 1) / 6);

    return {
      importId: `mock-${nameKey(name)}`,
      name,
      geometry_geojson: geometry,
      osm_way_id: null,
      estimated_houses: 18 + index * 4,
      duplicateStreetId: duplicate?.id ?? null,
      selected: !duplicate,
      source: "mock",
    };
  });
}

function createLineInsidePolygon(
  polygon: GeoJsonPolygon,
  fraction: number,
): GeoJsonLineString {
  const points = polygon.coordinates[0];
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lat = minLat + (maxLat - minLat) * fraction;
  const inset = (maxLng - minLng) * 0.18;

  return {
    type: "LineString",
    coordinates: [
      [minLng + inset, lat],
      [maxLng - inset, lat + (maxLat - minLat) * 0.03],
    ],
  };
}

function markDuplicates(
  streets: ImportedStreetPreview[],
  existingStreets: StreetRow[],
) {
  return streets.map((street) => {
    const duplicate = findDuplicateStreet(
      street.name,
      street.osm_way_id,
      existingStreets,
    );
    return {
      ...street,
      duplicateStreetId: duplicate?.id ?? null,
      selected: duplicate ? false : street.selected,
    };
  });
}

function findDuplicateStreet(
  name: string,
  osmWayId: number | null,
  existingStreets: StreetRow[],
) {
  return existingStreets.find((street) => {
    if (osmWayId && street.osm_way_id === osmWayId) return true;
    return nameKey(street.name) === nameKey(name);
  });
}

function estimateHousesForLine(line: GeoJsonLineString) {
  const distance = line.coordinates.reduce((sum, coordinate, index, all) => {
    if (index === 0) return 0;
    return sum + distanceMeters(all[index - 1], coordinate);
  }, 0);

  return Math.max(6, Math.round(distance / 11));
}

function distanceMeters(a: [number, number], b: [number, number]) {
  const latMeters = (b[1] - a[1]) * 111_320;
  const lngMeters =
    (b[0] - a[0]) * 111_320 * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));

  return Math.sqrt(latMeters * latMeters + lngMeters * lngMeters);
}

function asPolygon(value: Json): GeoJsonPolygon | null {
  const polygon = value as Partial<GeoJsonPolygon>;
  if (
    polygon.type !== "Polygon" ||
    !Array.isArray(polygon.coordinates) ||
    !Array.isArray(polygon.coordinates[0]) ||
    polygon.coordinates[0].length < 4
  ) {
    return null;
  }

  return polygon as GeoJsonPolygon;
}

function stablePolygonKey(polygon: GeoJsonPolygon) {
  return polygon.coordinates[0]
    .map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)
    .join("|");
}

function nameKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function readCachedImport(key: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw) as {
      savedAt: number;
      streets: ImportedStreetPreview[];
    };

    if (Date.now() - payload.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }

    return Array.isArray(payload.streets) ? payload.streets : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeCachedImport(key: string, streets: ImportedStreetPreview[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    key,
    JSON.stringify({
      savedAt: Date.now(),
      streets,
    }),
  );
}
