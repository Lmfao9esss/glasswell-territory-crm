import type { LeadStatus, QuickResult } from "@/lib/map/types";

import { humanize } from "./formatters";

export function leadStatusLabel(status: LeadStatus | "all") {
  if (status === "all") return "All leads";
  if (status === "waiting") return "Waiting For Response";
  return humanize(status);
}

export function quickResultToLeadStatus(result: QuickResult): LeadStatus {
  if (result === "quoted") return "quoted";
  if (result === "booked") return "booked";
  if (result === "call_back") return "waiting";
  if (result === "do_not_contact") return "do_not_contact";
  if (result === "no_answer") return "no_answer";
  return "interested";
}

export function quickResultLabel(result: QuickResult) {
  if (result === "call_back") return "Call Back";
  if (result === "do_not_contact") return "Do Not Contact";
  return humanize(result);
}
