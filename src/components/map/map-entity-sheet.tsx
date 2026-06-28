"use client";

import { useState } from "react";
import {
  Briefcase,
  Calendar,
  Camera,
  ChevronDown,
  Lock,
  MessageSquare,
  Navigation,
  Pencil,
  Phone,
  UserPlus,
} from "lucide-react";

import { Metric, MiniMetric, SheetHeader } from "@/components/map/sheet-primitives";
import {
  getActiveLock,
  getLockDisplay,
  type TerritoryMetrics,
} from "@/lib/map/calculations";
import {
  leadStatusColors,
  streetStatusColors,
  streetStatusLabels,
  territoryColorByCompletion,
} from "@/lib/map/colors";
import { humanize } from "@/lib/map/formatters";
import type {
  ActivityLogItem,
  CustomerRow,
  FollowUpRow,
  JobRow,
  LeadRow,
  ProfileRow,
  SelectedMapEntity,
  StreetLockState,
  StreetRow,
  StreetStatus,
  TerritoryRow,
  TerritoryStatus,
  TimelineItem,
} from "@/lib/map/types";

const streetGroups: Array<{ label: string; statuses: StreetStatus[] }> = [
  { label: "Currently knocking", statuses: ["active"] },
  { label: "Not knocked", statuses: ["not_knocked"] },
  { label: "Completed", statuses: ["completed"] },
  { label: "Skipped", statuses: ["skipped"] },
  { label: "Do not knock", statuses: ["do_not_knock"] },
];

export function MapEntitySheet({
  activities,
  customers,
  employees,
  entity,
  followUps,
  jobs,
  leads,
  locks,
  metrics,
  onAddStreetNote,
  onAssignTerritory,
  onAttachPhoto,
  onBookJob,
  onConvertLead,
  onCreateFollowUp,
  onClose,
  onMarkLeadLost,
  onOverrideLock,
  onRenameTerritory,
  onSelectEntity,
  onStreetStatusChange,
  onTerritoryStatusChange,
  streets,
  timeline,
  territories,
}: {
  activities: ActivityLogItem[];
  customers: CustomerRow[];
  employees: Map<string, ProfileRow>;
  entity: SelectedMapEntity;
  followUps: FollowUpRow[];
  jobs: JobRow[];
  leads: LeadRow[];
  locks: StreetLockState[];
  metrics: Map<string, TerritoryMetrics>;
  onAddStreetNote: (street: StreetRow) => void;
  onAssignTerritory: (territory: TerritoryRow, employeeId: string) => void;
  onAttachPhoto: (
    type: "before" | "after",
    subjectType: "lead" | "customer",
    subjectId: string,
  ) => void;
  onBookJob: (subjectType: "lead" | "customer", subjectId: string) => void;
  onConvertLead: (lead: LeadRow) => void;
  onCreateFollowUp: (
    subjectType: "lead" | "customer",
    subjectId: string,
    label: string,
    days: number,
  ) => void;
  onClose: () => void;
  onMarkLeadLost: (lead: LeadRow) => void;
  onOverrideLock: (street: StreetRow) => void;
  onRenameTerritory: (territory: TerritoryRow) => void;
  onSelectEntity: (entity: SelectedMapEntity) => void;
  onStreetStatusChange: (street: StreetRow, status: StreetStatus) => void;
  onTerritoryStatusChange: (
    territory: TerritoryRow,
    status: TerritoryStatus,
  ) => void;
  streets: StreetRow[];
  timeline: TimelineItem[];
  territories: TerritoryRow[];
}) {
  const title =
    entity.type === "lead"
      ? entity.item.customer_name
      : entity.type === "customer"
        ? entity.item.name
      : entity.type === "street"
        ? entity.item.name
        : entity.item.name;
  const employeeId =
    entity.type === "territory"
      ? entity.item.assigned_employee_id
      : entity.type === "street" || entity.type === "lead"
        ? entity.item.assigned_employee_id
        : null;
  const employeeName = employeeId
    ? employees.get(employeeId)?.full_name ?? "Assigned employee"
    : "Unassigned";

  return (
    <section className="absolute inset-x-0 bottom-[4.75rem] top-[12.25rem] z-[1210] px-3 pb-3 sm:px-5">
      <div className="mx-auto flex max-h-full max-w-md flex-col rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
        <SheetHeader
          eyebrow={humanize(entity.type)}
          onClose={onClose}
          title={title}
          subtitle={employeeName}
        />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {entity.type === "territory" ? (
            <TerritoryDetails
              activities={activities}
              employees={employees}
              leads={leads}
              locks={locks}
              metrics={metrics.get(entity.item.id)}
              onAddStreetNote={onAddStreetNote}
              onAssignTerritory={onAssignTerritory}
              onOverrideLock={onOverrideLock}
              onRenameTerritory={onRenameTerritory}
              onSelectEntity={onSelectEntity}
              onStreetStatusChange={onStreetStatusChange}
              onTerritoryStatusChange={onTerritoryStatusChange}
              streets={streets}
              territory={entity.item}
            />
          ) : null}
          {entity.type === "street" ? (
            <StreetDetails
              employees={employees}
              locks={locks}
              onAddStreetNote={onAddStreetNote}
              onOverrideLock={onOverrideLock}
              onStreetStatusChange={onStreetStatusChange}
              street={entity.item}
            />
          ) : null}
          {entity.type === "lead" ? (
            <LeadDetails
              customers={customers}
              followUps={followUps}
              jobs={jobs}
              lead={entity.item}
              onAttachPhoto={onAttachPhoto}
              onBookJob={onBookJob}
              onConvertLead={onConvertLead}
              onCreateFollowUp={onCreateFollowUp}
              onMarkLeadLost={onMarkLeadLost}
              timeline={timeline}
              territories={territories}
              streets={streets}
            />
          ) : null}
          {entity.type === "customer" ? (
            <CustomerDetails
              customer={entity.item}
              followUps={followUps}
              jobs={jobs}
              onAttachPhoto={onAttachPhoto}
              onBookJob={onBookJob}
              onCreateFollowUp={onCreateFollowUp}
              timeline={timeline}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TerritoryDetails({
  activities,
  employees,
  leads,
  locks,
  metrics,
  onAddStreetNote,
  onAssignTerritory,
  onOverrideLock,
  onRenameTerritory,
  onSelectEntity,
  onStreetStatusChange,
  onTerritoryStatusChange,
  streets,
  territory,
}: {
  activities: ActivityLogItem[];
  employees: Map<string, ProfileRow>;
  leads: LeadRow[];
  locks: StreetLockState[];
  metrics?: TerritoryMetrics;
  onAddStreetNote: (street: StreetRow) => void;
  onAssignTerritory: (territory: TerritoryRow, employeeId: string) => void;
  onOverrideLock: (street: StreetRow) => void;
  onRenameTerritory: (territory: TerritoryRow) => void;
  onSelectEntity: (entity: SelectedMapEntity) => void;
  onStreetStatusChange: (street: StreetRow, status: StreetStatus) => void;
  onTerritoryStatusChange: (
    territory: TerritoryRow,
    status: TerritoryStatus,
  ) => void;
  streets: StreetRow[];
  territory: TerritoryRow;
}) {
  const [view, setView] = useState<"streets" | "leads" | "analytics">("streets");
  const territoryStreets = streets.filter(
    (street) => street.territory_id === territory.id,
  );
  const territoryLeads = leads.filter((lead) => lead.territory_id === territory.id);
  const employeesList = Array.from(employees.values()).filter(
    (employee) => employee.role === "employee",
  );

  return (
    <div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full"
          data-testid="territory-progress-bar"
          style={{
            backgroundColor: territoryColorByCompletion(metrics?.progressPercent ?? 0),
            width: `${metrics?.progressPercent ?? 0}%`,
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Progress" value={`${metrics?.progressPercent ?? 0}%`} />
        <Metric label="Revenue" value={`$${metrics?.revenue ?? 0}`} />
        <Metric
          label="Streets"
          value={`${metrics?.completedStreets ?? 0}/${metrics?.totalTrackableStreets ?? 0}`}
        />
        <Metric label="Leads" value={`${metrics?.leadCount ?? 0}`} />
        <Metric label="Quotes" value={`${metrics?.quoteCount ?? 0}`} />
        <Metric label="Booked" value={`${metrics?.bookedJobCount ?? 0}`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-semibold text-white active:scale-[0.98]"
          type="button"
          onClick={() => onRenameTerritory(territory)}
        >
          <Pencil size={16} />
          Edit name
        </button>
        <label className="relative">
          <span className="sr-only">Assign employee</span>
          <select
            className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-3 pr-8 text-sm font-semibold"
            value={territory.assigned_employee_id ?? ""}
            onChange={(event) => onAssignTerritory(territory, event.target.value)}
          >
            {employeesList.map((employee) => (
              <option key={employee.id} value={employee.id}>
                Assign {employee.full_name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={16}
          />
        </label>
        <label className="relative col-span-2">
          <span className="sr-only">Change territory status</span>
          <select
            className="h-12 w-full appearance-none rounded-2xl border border-zinc-200 bg-zinc-50 px-3 pr-8 text-sm font-semibold"
            value={territory.status}
            onChange={(event) =>
              onTerritoryStatusChange(
                territory,
                event.target.value as TerritoryStatus,
              )
            }
          >
            {["not_started", "active", "paused", "completed"].map((status) => (
              <option key={status} value={status}>
                Status {humanize(status)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={16}
          />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["streets", "View streets"],
          ["leads", "View leads"],
          ["analytics", "Analytics"],
        ].map(([nextView, label]) => (
          <button
            className={`h-11 rounded-2xl px-2 text-sm font-semibold ${
              view === nextView
                ? "bg-zinc-950 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
            key={nextView}
            type="button"
            onClick={() => setView(nextView as typeof view)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "streets" ? (
        <StreetGroups
          employees={employees}
          locks={locks}
          onAddStreetNote={onAddStreetNote}
          onOverrideLock={onOverrideLock}
          onSelectStreet={(street) => onSelectEntity({ type: "street", item: street })}
          onStreetStatusChange={onStreetStatusChange}
          streets={territoryStreets}
        />
      ) : null}
      {view === "leads" ? <LeadList leads={territoryLeads} /> : null}
      {view === "analytics" ? (
        <AnalyticsSummary metrics={metrics} territory={territory} />
      ) : null}
      <div className="mt-4 rounded-3xl bg-zinc-100 p-3">
        <p className="mb-2 text-xs font-bold uppercase text-zinc-500">
          Latest activity
        </p>
        <ActivityPreview
          activities={activities.filter(
            (activity) => activity.territoryId === territory.id,
          )}
          leads={leads}
        />
      </div>
    </div>
  );
}

function StreetGroups({
  employees,
  locks,
  onAddStreetNote,
  onOverrideLock,
  onSelectStreet,
  onStreetStatusChange,
  streets,
}: {
  employees: Map<string, ProfileRow>;
  locks: StreetLockState[];
  onAddStreetNote: (street: StreetRow) => void;
  onOverrideLock: (street: StreetRow) => void;
  onSelectStreet: (street: StreetRow) => void;
  onStreetStatusChange: (street: StreetRow, status: StreetStatus) => void;
  streets: StreetRow[];
}) {
  return (
    <div className="mt-4 space-y-4">
      {streetGroups.map((group) => {
        const groupStreets = streets.filter((street) =>
          group.statuses.includes(street.status),
        );

        return (
          <section key={group.label}>
            <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">
              {group.label} · {groupStreets.length}
            </h3>
            <div className="space-y-2">
              {groupStreets.length ? (
                groupStreets.map((street) => (
                  <StreetRowItem
                    employees={employees}
                    key={street.id}
                    locks={locks}
                    onAddStreetNote={onAddStreetNote}
                    onOverrideLock={onOverrideLock}
                    onSelectStreet={onSelectStreet}
                    onStreetStatusChange={onStreetStatusChange}
                    street={street}
                  />
                ))
              ) : (
                <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500">
                  No streets in this group.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StreetRowItem({
  employees,
  locks,
  onAddStreetNote,
  onOverrideLock,
  onSelectStreet,
  onStreetStatusChange,
  street,
}: {
  employees: Map<string, ProfileRow>;
  locks: StreetLockState[];
  onAddStreetNote: (street: StreetRow) => void;
  onOverrideLock: (street: StreetRow) => void;
  onSelectStreet: (street: StreetRow) => void;
  onStreetStatusChange: (street: StreetRow, status: StreetStatus) => void;
  street: StreetRow;
}) {
  const activeLock = getActiveLock(street.id, locks);
  const lockDisplay = getLockDisplay(street, locks, employees);

  return (
    <div className="rounded-3xl bg-zinc-100 p-3">
      <button
        className="mb-2 flex w-full items-start justify-between gap-3 text-left"
        type="button"
        onClick={() => onSelectStreet(street)}
      >
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{street.name}</p>
          <p className="truncate text-xs text-zinc-500">
            {street.houses_knocked}/{street.estimated_houses} houses ·{" "}
            {street.completion_percent}%
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: `${streetStatusColors[street.status]}20`,
            color: streetStatusColors[street.status],
          }}
        >
          {streetStatusLabels[street.status]}
        </span>
      </button>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${lockDisplay.tone}`}
        >
          <Lock size={13} />
          {lockDisplay.label}
        </span>
        {activeLock ? (
          <button
            className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-700"
            type="button"
            onClick={() => onOverrideLock(street)}
          >
            Override
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <SmallAction
          ariaLabel={`Start ${street.name}`}
          onClick={() => onStreetStatusChange(street, "active")}
        >
          Start
        </SmallAction>
        <SmallAction
          ariaLabel={`Complete ${street.name}`}
          onClick={() => onStreetStatusChange(street, "completed")}
        >
          Complete
        </SmallAction>
        <SmallAction
          ariaLabel={`Skip ${street.name}`}
          onClick={() => onStreetStatusChange(street, "skipped")}
        >
          Skip
        </SmallAction>
        <SmallAction
          ariaLabel={`Do not knock ${street.name}`}
          onClick={() => onStreetStatusChange(street, "do_not_knock")}
        >
          Dnk
        </SmallAction>
        <SmallAction
          ariaLabel={`Add note ${street.name}`}
          onClick={() => onAddStreetNote(street)}
        >
          Note
        </SmallAction>
      </div>
    </div>
  );
}

function StreetDetails({
  employees,
  locks,
  onAddStreetNote,
  onOverrideLock,
  onStreetStatusChange,
  street,
}: {
  employees: Map<string, ProfileRow>;
  locks: StreetLockState[];
  onAddStreetNote: (street: StreetRow) => void;
  onOverrideLock: (street: StreetRow) => void;
  onStreetStatusChange: (street: StreetRow, status: StreetStatus) => void;
  street: StreetRow;
}) {
  const activeLock = getActiveLock(street.id, locks);
  const lockDisplay = getLockDisplay(street, locks, employees);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: streetStatusColors[street.status] }}
          />
          {streetStatusLabels[street.status]}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${lockDisplay.tone}`}
        >
          <Lock size={14} />
          {lockDisplay.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Coverage" value={`${street.completion_percent}%`} />
        <Metric
          label="Houses"
          value={`${street.houses_knocked}/${street.estimated_houses}`}
        />
        <Metric label="Last knock" value={street.last_knock_date ?? "None"} />
        <Metric
          label="Next visit"
          value={street.next_recommended_revisit_date ?? "None"}
        />
        <Metric label="OSM way" value={street.osm_way_id?.toString() ?? "None"} />
        <Metric label="Status" value={streetStatusLabels[street.status]} />
      </div>
      {activeLock ? (
        <button
          className="mt-3 h-11 w-full rounded-2xl bg-amber-100 px-3 text-sm font-bold text-amber-900"
          type="button"
          onClick={() => onOverrideLock(street)}
        >
          Manager override lock
        </button>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <SmallAction
          ariaLabel={`Start ${street.name}`}
          onClick={() => onStreetStatusChange(street, "active")}
        >
          Start
        </SmallAction>
        <SmallAction
          ariaLabel={`Complete ${street.name}`}
          onClick={() => onStreetStatusChange(street, "completed")}
        >
          Complete
        </SmallAction>
        <SmallAction
          ariaLabel={`Skip ${street.name}`}
          onClick={() => onStreetStatusChange(street, "skipped")}
        >
          Skip
        </SmallAction>
        <SmallAction
          ariaLabel={`Do not knock ${street.name}`}
          onClick={() => onStreetStatusChange(street, "do_not_knock")}
        >
          Dnk
        </SmallAction>
        <SmallAction
          ariaLabel={`Add note ${street.name}`}
          onClick={() => onAddStreetNote(street)}
        >
          Note
        </SmallAction>
      </div>
      {street.notes ? (
        <p className="mt-3 rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-600">
          {street.notes}
        </p>
      ) : null}
    </div>
  );
}

function LeadList({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="mt-4 space-y-2">
      {leads.length ? (
        leads.map((lead) => (
          <div className="rounded-3xl bg-zinc-100 p-3" key={lead.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{lead.customer_name}</p>
                <p className="truncate text-xs text-zinc-500">{lead.address}</p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `${leadStatusColors[lead.status]}20`,
                  color: leadStatusColors[lead.status],
                }}
              >
                {humanize(lead.status)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <MiniMetric
                label="Quote"
                value={lead.quote_amount ? `$${lead.quote_amount}` : "None"}
              />
              <MiniMetric label="Job" value={humanize(lead.job_status)} />
              <MiniMetric label="Follow" value={lead.follow_up_date ?? "None"} />
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500">
          No leads in this territory.
        </p>
      )}
    </div>
  );
}

function AnalyticsSummary({
  metrics,
  territory,
}: {
  metrics?: TerritoryMetrics;
  territory: TerritoryRow;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Metric label="Calculated progress" value={`${metrics?.progressPercent ?? 0}%`} />
      <Metric label="Stored progress" value={`${territory.progress_percent}%`} />
      <Metric label="Leads" value={`${metrics?.leadCount ?? 0}`} />
      <Metric label="Quotes" value={`${metrics?.quoteCount ?? 0}`} />
      <Metric label="Booked jobs" value={`${metrics?.bookedJobCount ?? 0}`} />
      <Metric label="Revenue" value={`$${metrics?.revenue ?? 0}`} />
    </div>
  );
}

function LeadDetails({
  customers,
  followUps,
  jobs,
  lead,
  onAttachPhoto,
  onBookJob,
  onConvertLead,
  onCreateFollowUp,
  onMarkLeadLost,
  streets,
  timeline,
  territories,
}: {
  customers: CustomerRow[];
  followUps: FollowUpRow[];
  jobs: JobRow[];
  lead: LeadRow;
  onAttachPhoto: (
    type: "before" | "after",
    subjectType: "lead" | "customer",
    subjectId: string,
  ) => void;
  onBookJob: (subjectType: "lead" | "customer", subjectId: string) => void;
  onConvertLead: (lead: LeadRow) => void;
  onCreateFollowUp: (
    subjectType: "lead" | "customer",
    subjectId: string,
    label: string,
    days: number,
  ) => void;
  onMarkLeadLost: (lead: LeadRow) => void;
  streets: StreetRow[];
  timeline: TimelineItem[];
  territories: TerritoryRow[];
}) {
  const street = streets.find((item) => item.id === lead.street_id);
  const territory = territories.find((item) => item.id === lead.territory_id);
  const customer = lead.customer_id
    ? customers.find((item) => item.id === lead.customer_id)
    : null;
  const subjectTimeline = timelineFor({ leadId: lead.id, customerId: customer?.id }, timeline);
  const subjectFollowUps = followUps.filter((item) => item.lead_id === lead.id);
  const subjectJobs = jobs.filter((item) => item.lead_id === lead.id);

  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: leadStatusColors[lead.status] }}
        />
        {humanize(lead.status)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Quote" value={lead.quote_amount ? `$${lead.quote_amount}` : "None"} />
        <Metric label="Follow-up" value={lead.follow_up_date ?? "None"} />
        <Metric label="Street" value={street?.name ?? "Unknown"} />
        <Metric label="Territory" value={territory?.name ?? "Unknown"} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <QuickAction icon={<Phone size={16} />} label="Call" />
        <QuickAction icon={<MessageSquare size={16} />} label="Text" />
        <QuickAction icon={<Navigation size={16} />} label="Directions" />
        <QuickAction
          icon={<Briefcase size={16} />}
          label="Book Job"
          onClick={() => onBookJob("lead", lead.id)}
        />
        <QuickAction
          icon={<Calendar size={16} />}
          label="Follow Up"
          onClick={() => onCreateFollowUp("lead", lead.id, "Tomorrow", 1)}
        />
        <QuickAction label="Mark Lost" onClick={() => onMarkLeadLost(lead)} />
        <QuickAction
          icon={<UserPlus size={16} />}
          label="Convert"
          onClick={() => onConvertLead(lead)}
        />
        <QuickAction
          icon={<Camera size={16} />}
          label="Before"
          onClick={() => onAttachPhoto("before", "lead", lead.id)}
        />
        <QuickAction
          icon={<Camera size={16} />}
          label="After"
          onClick={() => onAttachPhoto("after", "lead", lead.id)}
        />
      </div>
      <FollowUpPresets
        onSelect={(label, days) => onCreateFollowUp("lead", lead.id, label, days)}
      />
      <PhotoStrip before={lead.before_photo_urls} after={lead.after_photo_urls} />
      <TimelineList items={subjectTimeline} />
      <FollowUpStatusList followUps={subjectFollowUps} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Open follow-ups" value={`${subjectFollowUps.length}`} />
        <Metric label="Jobs" value={`${subjectJobs.length}`} />
      </div>
      <p className="mt-3 text-sm text-zinc-600">{lead.address}</p>
      {lead.notes ? <p className="mt-1 text-sm text-zinc-600">{lead.notes}</p> : null}
    </div>
  );
}

function CustomerDetails({
  customer,
  followUps,
  jobs,
  onAttachPhoto,
  onBookJob,
  onCreateFollowUp,
  timeline,
}: {
  customer: CustomerRow;
  followUps: FollowUpRow[];
  jobs: JobRow[];
  onAttachPhoto: (
    type: "before" | "after",
    subjectType: "lead" | "customer",
    subjectId: string,
  ) => void;
  onBookJob: (subjectType: "lead" | "customer", subjectId: string) => void;
  onCreateFollowUp: (
    subjectType: "lead" | "customer",
    subjectId: string,
    label: string,
    days: number,
  ) => void;
  timeline: TimelineItem[];
}) {
  const customerJobs = jobs.filter((job) => job.customer_id === customer.id);
  const customerFollowUps = followUps.filter(
    (followUp) => followUp.customer_id === customer.id,
  );
  const totalRevenue = customerJobs.reduce((sum, job) => sum + job.revenue, 0);
  const nextDue =
    customerJobs
      .map((job) => job.next_service_due_at)
      .filter(Boolean)
      .sort()[0] ?? "None";

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Phone" value={customer.phone ?? "None"} />
        <Metric label="Email" value={customer.email ?? "None"} />
        <Metric label="Next due" value={nextDue ? String(nextDue).slice(0, 10) : "None"} />
        <Metric label="Revenue" value={`$${totalRevenue}`} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <QuickAction icon={<Phone size={16} />} label="Call" />
        <QuickAction icon={<MessageSquare size={16} />} label="Text" />
        <QuickAction icon={<Navigation size={16} />} label="Directions" />
        <QuickAction
          icon={<Briefcase size={16} />}
          label="Book Job"
          onClick={() => onBookJob("customer", customer.id)}
        />
        <QuickAction
          icon={<Calendar size={16} />}
          label="Follow Up"
          onClick={() => onCreateFollowUp("customer", customer.id, "Tomorrow", 1)}
        />
        <QuickAction label="Edit" />
        <QuickAction
          icon={<Camera size={16} />}
          label="Before"
          onClick={() => onAttachPhoto("before", "customer", customer.id)}
        />
        <QuickAction
          icon={<Camera size={16} />}
          label="After"
          onClick={() => onAttachPhoto("after", "customer", customer.id)}
        />
      </div>
      <FollowUpPresets
        onSelect={(label, days) =>
          onCreateFollowUp("customer", customer.id, label, days)
        }
      />
      <div className="mt-3 rounded-3xl bg-zinc-100 p-3">
        <p className="text-xs font-bold uppercase text-zinc-500">
          Service history
        </p>
        {customerJobs.map((job) => (
          <p className="mt-2 text-sm" key={job.id}>
            {humanize(job.service_type)} · {humanize(job.status)} · ${job.revenue}
          </p>
        ))}
        {!customerJobs.length ? (
          <p className="mt-2 text-sm text-zinc-500">No service history yet.</p>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Upcoming jobs" value={`${customerJobs.filter((job) => job.status === "booked").length}`} />
        <Metric label="Follow-ups" value={`${customerFollowUps.length}`} />
      </div>
      <FollowUpStatusList followUps={customerFollowUps} />
      <PhotoStrip before={[]} after={[]} />
      <TimelineList items={timelineFor({ customerId: customer.id }, timeline)} />
      <p className="mt-3 text-sm text-zinc-600">{customer.address}</p>
      {customer.notes ? (
        <p className="mt-1 text-sm text-zinc-600">{customer.notes}</p>
      ) : null}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-zinc-950 px-2 text-sm font-bold text-white active:scale-[0.98]"
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function FollowUpPresets({
  onSelect,
}: {
  onSelect: (label: string, days: number) => void;
}) {
  const presets = [
    ["Tomorrow", 1],
    ["3 Days", 3],
    ["1 Week", 7],
    ["2 Weeks", 14],
    ["1 Month", 30],
    ["Custom Date", 10],
  ] as const;

  return (
    <div className="mt-3 rounded-3xl bg-zinc-100 p-3">
      <p className="mb-2 text-xs font-bold uppercase text-zinc-500">
        Follow-ups
      </p>
      <div className="grid grid-cols-3 gap-2">
        {presets.map(([label, days]) => (
          <button
            className="h-10 rounded-2xl bg-white px-2 text-xs font-bold text-zinc-800"
            key={label}
            type="button"
            onClick={() => onSelect(label, days)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoStrip({ before, after }: { before: string[]; after: string[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <PhotoBucket label="Before photos" photos={before} />
      <PhotoBucket label="After photos" photos={after} />
    </div>
  );
}

function PhotoBucket({ label, photos }: { label: string; photos: string[] }) {
  return (
    <div className="rounded-3xl bg-zinc-100 p-3">
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <div className="mt-2 flex gap-1.5">
        {photos.length ? (
          photos.slice(0, 3).map((photo) => (
            <div
              className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[10px] font-bold text-zinc-500"
              key={photo}
            >
              JPG
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">None yet</p>
        )}
      </div>
    </div>
  );
}

function TimelineList({ items }: { items: TimelineItem[] }) {
  return (
    <div className="mt-3 rounded-3xl bg-zinc-100 p-3" data-testid="customer-timeline">
      <p className="mb-2 text-xs font-bold uppercase text-zinc-500">Timeline</p>
      {items.length ? (
        items.map((item) => (
          <div className="mb-2 last:mb-0" key={item.id}>
            <p className="text-sm font-bold">{item.label}</p>
            <p className="text-xs text-zinc-500">{item.description}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-zinc-500">No timeline yet.</p>
      )}
    </div>
  );
}

function FollowUpStatusList({ followUps }: { followUps: FollowUpRow[] }) {
  if (!followUps.length) return null;

  return (
    <div className="mt-3 rounded-3xl bg-zinc-100 p-3">
      <p className="mb-2 text-xs font-bold uppercase text-zinc-500">
        Follow-up status
      </p>
      {followUps.map((followUp) => {
        const overdue =
          followUp.status === "open" &&
          followUp.due_at.slice(0, 10) < "2026-06-27";

        return (
          <p
            className={`mb-2 rounded-2xl px-3 py-2 text-sm font-bold last:mb-0 ${
              overdue ? "bg-red-100 text-red-700" : "bg-white text-zinc-700"
            }`}
            key={followUp.id}
          >
            {overdue ? "Overdue: " : ""}
            {followUp.reason ?? "Follow-up"} · {followUp.due_at.slice(0, 10)}
          </p>
        );
      })}
    </div>
  );
}

function ActivityPreview({
  activities,
}: {
  activities: ActivityLogItem[];
  leads: LeadRow[];
}) {
  return (
    <div className="space-y-2" data-testid="activity-log-preview">
      {activities.slice(0, 5).map((activity) => (
        <p className="rounded-2xl bg-white px-3 py-2 text-sm" key={activity.id}>
          <span className="font-semibold">{humanize(activity.action)}:</span>{" "}
          {activity.message}
        </p>
      ))}
      {!activities.length ? (
        <p className="rounded-2xl bg-white px-3 py-2 text-sm text-zinc-500">
          No activity yet.
        </p>
      ) : null}
    </div>
  );
}

function SmallAction({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className="h-10 rounded-2xl bg-zinc-950 px-1 text-xs font-bold text-white active:scale-[0.98]"
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function timelineFor(
  subject: { customerId?: string; leadId?: string },
  timeline: TimelineItem[],
) {
  return timeline
    .filter(
      (item) =>
        (subject.customerId && item.customerId === subject.customerId) ||
        (subject.leadId && item.leadId === subject.leadId),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
