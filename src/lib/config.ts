import type { LatLngExpression } from "leaflet";

export const appConfig = {
  name: "Glasswell Territory CRM",
  companyName: "Glasswell Window Cleaning",
  defaultOrganizationSlug: "glasswell",
} as const;

export const mapConfig = {
  ottawaCenter: [45.4215, -75.6972] satisfies LatLngExpression,
  defaultZoom: 12,
  minZoom: 10,
  maxZoom: 19,
} as const;
