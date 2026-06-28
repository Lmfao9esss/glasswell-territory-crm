import type { Database } from "@/lib/db/database.types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type StreetStatus = Database["public"]["Enums"]["street_status"];

export const territoryProgressColors = {
  not_started: "#dc2626",
  started: "#f97316",
  halfway: "#eab308",
  almost_done: "#84cc16",
  completed: "#166534",
} as const;

export function territoryColorByCompletion(progressPercent: number) {
  if (progressPercent >= 100) return territoryProgressColors.completed;
  if (progressPercent >= 75) return territoryProgressColors.almost_done;
  if (progressPercent >= 50) return territoryProgressColors.halfway;
  if (progressPercent > 0) return territoryProgressColors.started;

  return territoryProgressColors.not_started;
}

export const streetStatusColors = {
  not_knocked: "#dc2626",
  active: "#2563eb",
  paused: "#2563eb",
  completed: "#16a34a",
  skipped: "#6b7280",
  do_not_knock: "#111827",
} as const satisfies Record<StreetStatus, string>;

export const leadStatusColors = {
  interested: "#2563eb",
  quoted: "#eab308",
  waiting: "#f97316",
  booked: "#16a34a",
  repeat_customer: "#9333ea",
  no_answer: "#6b7280",
  lost: "#dc2626",
  do_not_contact: "#111827",
} as const satisfies Record<LeadStatus, string>;

export const streetStatusLabels = {
  not_knocked: "Not knocked",
  active: "Currently knocking",
  paused: "Currently knocking",
  completed: "Completed",
  skipped: "Skipped",
  do_not_knock: "Do not knock",
} as const satisfies Record<StreetStatus, string>;
