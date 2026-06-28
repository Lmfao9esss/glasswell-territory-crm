import type { LatLngExpression } from "leaflet";

import type { Json } from "@/lib/db/database.types";

type GeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

export function polygonToLatLngs(geojson: Json): LatLngExpression[] {
  const polygon = geojson as GeoJsonPolygon;

  if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates[0])) {
    return [];
  }

  return polygon.coordinates[0].map(([lng, lat]) => [lat, lng]);
}

export function lineToLatLngs(geojson: Json): LatLngExpression[] {
  const line = geojson as GeoJsonLineString;

  if (line.type !== "LineString" || !Array.isArray(line.coordinates)) {
    return [];
  }

  return line.coordinates.map(([lng, lat]) => [lat, lng]);
}
