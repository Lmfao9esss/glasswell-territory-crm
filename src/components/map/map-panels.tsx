"use client";

import { ChevronDown } from "lucide-react";

import { OrganizationBootstrap } from "@/components/auth/organization-bootstrap";
import { streetStatusLabels } from "@/lib/map/colors";
import { humanize } from "@/lib/map/formatters";
import type {
  AuthProfileState,
  MapFilters,
  ProfileRow,
  StreetStatus,
  TerritoryRow,
} from "@/lib/map/types";

const streetFilterStatuses: Array<StreetStatus | "all"> = [
  "all",
  "not_knocked",
  "active",
  "completed",
  "skipped",
  "do_not_knock",
];

const leadFilterStatuses = [
  "all",
  "interested",
  "quoted",
  "waiting",
  "booked",
  "repeat_customer",
  "no_answer",
  "lost",
  "do_not_contact",
] as const;

export function CloudModeGuard({ auth }: { auth: AuthProfileState }) {
  if (!auth.isConfigured) {
    return (
      <GuardCard message="Supabase is not configured. Demo Mode is available." />
    );
  }

  if (!auth.userId) {
    return (
      <GuardCard
        message="Login is required for Cloud Mode. Demo Mode is available."
        href="/login"
        action="Open Login"
      />
    );
  }

  if (!auth.profile) {
    return (
      <section className="absolute inset-x-3 top-[20rem] z-[1250] mx-auto max-w-md">
        <OrganizationBootstrap auth={auth} />
      </section>
    );
  }

  if (!auth.profile.active) {
    return (
      <GuardCard message="Your profile is not active. Ask an owner or manager to activate it." />
    );
  }

  return null;
}

export function MapFiltersPanel({
  employees,
  filters,
  onChange,
  territories,
}: {
  employees: ProfileRow[];
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
  territories: TerritoryRow[];
}) {
  return (
    <section className="absolute left-3 right-3 top-[4.45rem] z-[900] mx-auto max-w-5xl">
      <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-white/80 bg-white/95 p-2 shadow-lg shadow-zinc-950/10 backdrop-blur sm:grid-cols-4">
        <FilterSelect
          label="Territory"
          value={filters.territoryId}
          onChange={(territoryId) => onChange({ ...filters, territoryId })}
          options={[
            { label: "All territories", value: "all" },
            ...territories.map((territory) => ({
              label: territory.name,
              value: territory.id,
            })),
          ]}
        />
        <FilterSelect
          label="Street"
          value={filters.streetStatus}
          onChange={(streetStatus) =>
            onChange({
              ...filters,
              streetStatus: streetStatus as MapFilters["streetStatus"],
            })
          }
          options={streetFilterStatuses.map((status) => ({
            label: status === "all" ? "All streets" : streetStatusLabels[status],
            value: status,
          }))}
        />
        <FilterSelect
          label="Lead"
          value={filters.leadStatus}
          onChange={(leadStatus) =>
            onChange({
              ...filters,
              leadStatus: leadStatus as MapFilters["leadStatus"],
            })
          }
          options={leadFilterStatuses.map((status) => ({
            label: status === "all" ? "All leads" : humanize(status),
            value: status,
          }))}
        />
        <FilterSelect
          label="Employee"
          value={filters.employeeId}
          onChange={(employeeId) => onChange({ ...filters, employeeId })}
          options={[
            { label: "All employees", value: "all" },
            ...employees.map((employee) => ({
              label: employee.full_name,
              value: employee.id,
            })),
          ]}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        className="h-11 w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-3 pr-8 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
        size={16}
      />
    </label>
  );
}

function GuardCard({
  action,
  href,
  message,
}: {
  action?: string;
  href?: string;
  message: string;
}) {
  return (
    <section className="absolute inset-x-3 top-[20rem] z-[1250] mx-auto max-w-md rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/20 backdrop-blur">
      <p className="text-sm font-black">{message}</p>
      {href && action ? (
        <a
          className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white"
          href={href}
        >
          {action}
        </a>
      ) : null}
    </section>
  );
}
