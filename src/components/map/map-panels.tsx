"use client";

import { ChevronDown, RotateCcw, Upload } from "lucide-react";

import { OrganizationBootstrap } from "@/components/auth/organization-bootstrap";
import { streetStatusLabels } from "@/lib/map/colors";
import { humanize } from "@/lib/map/formatters";
import type {
  AuthProfileState,
  DataMode,
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

export function DataToolsPanel({
  onExport,
  onImport,
  onReset,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}) {
  return (
    <section className="absolute left-3 top-[10.25rem] z-[1300] flex max-w-[11rem] flex-col gap-2 sm:left-5">
      <button
        className="flex h-11 items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95"
        type="button"
        onClick={onExport}
      >
        Export JSON
      </button>
      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95">
        <Upload size={15} />
        Import JSON
        <input
          className="sr-only"
          type="file"
          accept="application/json"
          aria-label="Import JSON backup"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onImport(file);
              event.target.value = "";
            }
          }}
        />
      </label>
      <button
        className="flex h-11 items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95"
        type="button"
        onClick={onReset}
      >
        <RotateCcw size={15} />
        Reset Demo
      </button>
    </section>
  );
}

export function DataModeSwitch({
  auth,
  dataMode,
  onChange,
}: {
  auth: AuthProfileState;
  dataMode: DataMode;
  onChange: (mode: DataMode) => void;
}) {
  return (
    <section className="pointer-events-none absolute left-3 right-3 top-[15.25rem] z-[1290] mx-auto max-w-md rounded-[24px] border border-white/80 bg-white/95 p-2 text-zinc-950 shadow-lg shadow-zinc-950/15 backdrop-blur">
      <div className="pointer-events-auto grid grid-cols-2 gap-2">
        {(["demo", "cloud"] as DataMode[]).map((mode) => (
          <button
            className={`h-11 rounded-2xl text-sm font-black active:scale-95 ${
              dataMode === mode
                ? "bg-zinc-950 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
          >
            {mode === "demo" ? "Demo Mode" : "Cloud Mode"}
          </button>
        ))}
      </div>
      {dataMode === "cloud" && auth.profile ? (
        <p className="mt-2 truncate px-2 text-xs font-bold text-zinc-500">
          {humanize(auth.profile.role)} - {auth.organization?.name ?? "No organization"}
        </p>
      ) : null}
    </section>
  );
}

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
