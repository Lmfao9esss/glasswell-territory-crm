"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardList,
  Lock,
  MessageSquare,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { formatDuration, humanize, today } from "@/lib/map/formatters";
import { loadLocalSnapshot } from "@/lib/map/local-persistence";
import { createMapDataRepository } from "@/lib/map/repositories";
import type {
  AuthProfileState,
  DataMode,
  FollowUpRow,
  JobRow,
  KnockingSessionRow,
  LeadRow,
  LocalMapSnapshot,
  MapData,
  ProfileRow,
  StreetLockState,
} from "@/lib/map/types";

type DashboardState = {
  mapData: MapData;
  locks: StreetLockState[];
  sessions: KnockingSessionRow[];
  snapshot: LocalMapSnapshot | null;
};

type PriorityItem = {
  id: string;
  title: string;
  detail: string;
  entity?: { type: "lead" | "customer" | "street" | "territory"; id: string };
};

const currency = new Intl.NumberFormat("en-CA", {
  currency: "CAD",
  style: "currency",
  maximumFractionDigits: 0,
});

export function OwnerCommandCenter({ auth }: { auth: AuthProfileState }) {
  const [dataMode, setDataMode] = useState<DataMode>("demo");
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setError(null);
        if (
          dataMode === "cloud" &&
          (!auth.isConfigured || !auth.userId || !auth.profile?.active)
        ) {
          setState(null);
          setError("Supabase is not configured. Demo Mode is available.");
          return;
        }

        const repository = createMapDataRepository(dataMode);
        const [mapData, sessions, cloudLocks] = await Promise.all([
          repository.loadMapData(),
          repository.listKnockingSessions(),
          repository.listStreetLocks(),
        ]);
        const snapshot =
          dataMode === "demo" ? loadLocalSnapshot().snapshot ?? null : null;
        const locks =
          dataMode === "demo"
            ? snapshot?.streetLocks ?? []
            : cloudLocks.map((lock) => ({
                id: lock.id,
                streetId: lock.street_id,
                employeeId: lock.employee_id,
                lockedAt: lock.locked_at,
                expiresAt: lock.expires_at,
                releasedAt: lock.released_at,
                releasedBy: lock.released_by,
                overrideReason: lock.override_reason,
              }));

        if (active) {
          setState({ mapData, locks, sessions, snapshot });
        }
      } catch (loadError) {
        if (active) {
          setState(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Dashboard data could not be loaded.",
          );
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [auth.isConfigured, auth.profile?.active, auth.userId, dataMode]);

  const derived = useMemo(
    () => (state ? deriveDashboard(state, nowMs) : null),
    [nowMs, state],
  );

  return (
    <div className="h-dvh overflow-y-auto bg-[#d7e3dc] pb-28 pt-20 text-zinc-950">
      <main className="mx-auto max-w-5xl px-3 sm:px-5">
        <section className="mb-3 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-xl shadow-zinc-950/10 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">
                Owner Command Center
              </p>
              <h1 className="text-2xl font-black">Today</h1>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1">
              {(["demo", "cloud"] as DataMode[]).map((mode) => (
                <button
                  className={`h-10 rounded-xl px-3 text-xs font-black ${
                    dataMode === mode
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600"
                  }`}
                  key={mode}
                  type="button"
                  onClick={() => setDataMode(mode)}
                >
                  {mode === "demo" ? "Demo" : "Cloud"}
                </button>
              ))}
            </div>
          </div>
          {error ? (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950">
              {error}
            </p>
          ) : null}
        </section>

        {derived ? (
          <>
            <section className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-6">
              <MetricCard label="Booked week" value={currency.format(derived.metrics.revenueBookedWeek)} />
              <MetricCard label="Completed month" value={currency.format(derived.metrics.revenueCompletedMonth)} />
              <MetricCard label="Open quotes" value={`${derived.metrics.openQuotes}`} />
              <MetricCard label="Booked jobs" value={`${derived.metrics.bookedJobs}`} />
              <MetricCard label="New leads week" value={`${derived.metrics.newLeadsWeek}`} />
              <MetricCard label="Follow-up rate" value={`${derived.metrics.followUpCompletionRate}%`} />
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <PriorityCard icon={<AlertTriangle size={18} />} title="Overdue follow-ups" items={derived.overdueFollowUps} empty="No overdue follow-ups." />
              <PriorityCard icon={<CalendarClock size={18} />} title="Follow-ups due today" items={derived.followUpsToday} empty="No follow-ups due today." />
              <PriorityCard icon={<Briefcase size={18} />} title="Jobs scheduled today" items={derived.jobsToday} empty="No jobs scheduled today." />
              <PriorityCard icon={<RefreshCw size={18} />} title="Active shifts" items={derived.activeShifts} empty="No active shifts." />
              <PriorityCard icon={<Lock size={18} />} title="Streets currently locked" items={derived.lockedStreets} empty="No streets are locked." />
              <PriorityCard icon={<MessageSquare size={18} />} title="Pending quotes" items={derived.pendingQuotes} empty="No pending quotes." />
              <PriorityCard icon={<ClipboardList size={18} />} title="Recently created leads" items={derived.recentLeads} empty="No recent leads." />
              <PriorityCard icon={<Camera size={18} />} title="Jobs needing photos" items={derived.jobsNeedingPhotos} empty="No jobs need photos." />
              <PriorityCard icon={<CheckCircle2 size={18} />} title="Territories with low progress" items={derived.lowProgressTerritories} empty="All territories are moving." />
              <PriorityCard icon={<UserRound size={18} />} title="Customers due for repeat service" items={derived.repeatCustomersDue} empty="No repeat customers due." />
            </section>

            <section className="mt-3 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-xl shadow-zinc-950/10 backdrop-blur">
              <h2 className="text-lg font-black">Employee activity</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {derived.employeeActivity.map((employee) => (
                  <div
                    className="rounded-3xl bg-zinc-100 p-3"
                    key={employee.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {employee.name}
                        </p>
                        <p className="truncate text-xs font-bold text-zinc-500">
                          {employee.currentStreet}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${
                          employee.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-white text-zinc-500"
                        }`}
                      >
                        {employee.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      <MiniMetric label="Shift" value={employee.duration} />
                      <MiniMetric label="Doors" value={`${employee.houses}`} />
                      <MiniMetric label="Leads" value={`${employee.leads}`} />
                      <MiniMetric label="Jobs" value={`${employee.jobs}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-[28px] border border-white/80 bg-white/95 p-4 text-sm font-bold text-zinc-600 shadow-xl shadow-zinc-950/10 backdrop-blur">
            Dashboard data is not available yet.
          </section>
        )}
      </main>
    </div>
  );
}

function PriorityCard({
  empty,
  icon,
  items,
  title,
}: {
  empty: string;
  icon: React.ReactNode;
  items: PriorityItem[];
  title: string;
}) {
  return (
    <section className="rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-xl shadow-zinc-950/10 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-base font-black">{title}</h2>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              className="w-full rounded-2xl bg-zinc-100 p-3 text-left active:scale-[0.99]"
              key={item.id}
              type="button"
              onClick={() => item.entity && openMapEntity(item.entity)}
            >
              <p className="text-sm font-black">{item.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-zinc-600">
                {item.detail}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-600">
          {empty}
        </p>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 p-3 shadow-lg shadow-zinc-950/10 backdrop-blur">
      <p className="text-[11px] font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-2">
      <p className="text-[10px] font-bold uppercase text-zinc-500">{label}</p>
      <p className="truncate text-xs font-black">{value}</p>
    </div>
  );
}

function openMapEntity(entity: NonNullable<PriorityItem["entity"]>) {
  window.sessionStorage.setItem("glasswell.openEntity", JSON.stringify(entity));
  window.location.href = "/";
}

function deriveDashboard(state: DashboardState, nowMs: number) {
  const { mapData, locks, sessions, snapshot } = state;
  const todayKey = today();
  const weekStart = startOfWeek(new Date(nowMs));
  const monthStart = new Date(new Date(nowMs).getFullYear(), new Date(nowMs).getMonth(), 1);
  const openFollowUps = mapData.followUps.filter((followUp) => followUp.status === "open");
  const completedFollowUps = mapData.followUps.filter(
    (followUp) => followUp.status === "completed",
  );

  const overdueFollowUps = openFollowUps
    .filter((followUp) => followUp.due_at.slice(0, 10) < todayKey)
    .map((followUp) => followUpItem(followUp, mapData));
  const followUpsToday = openFollowUps
    .filter((followUp) => followUp.due_at.slice(0, 10) === todayKey)
    .map((followUp) => followUpItem(followUp, mapData));
  const jobsToday = mapData.jobs
    .filter((job) => job.scheduled_at?.slice(0, 10) === todayKey)
    .map((job) => jobItem(job, mapData));
  const activeSessions = [
    ...sessions
      .filter((session) => session.status === "active")
      .map((session) => sessionItem(session, mapData, nowMs)),
    ...(snapshot?.shift && !snapshot.shift.endedAt
      ? [snapshotShiftItem(snapshot, mapData, nowMs)]
      : []),
  ];
  const activeLocks = locks
    .filter((lock) => !lock.releasedAt)
    .map((lock) => lockItem(lock, mapData));
  const pendingQuotes = mapData.leads
    .filter((lead) => lead.job_status === "quoted" || lead.status === "quoted")
    .map((lead) => leadItem(lead, "Quote pending"));
  const recentLeads = [...mapData.leads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((lead) => leadItem(lead, "New lead"));
  const jobsNeedingPhotos = mapData.jobs
    .filter((job) => job.status === "completed")
    .filter((job) => {
      const lead = job.lead_id
        ? mapData.leads.find((item) => item.id === job.lead_id)
        : null;
      return !lead || !lead.before_photo_urls.length || !lead.after_photo_urls.length;
    })
    .map((job) => jobItem(job, mapData, "Needs before/after photos"));
  const lowProgressTerritories = mapData.territories
    .filter((territory) => territory.progress_percent < 50)
    .map((territory) => ({
      id: territory.id,
      title: territory.name,
      detail: `${Math.round(territory.progress_percent)}% complete`,
      entity: { type: "territory" as const, id: territory.id },
    }));
  const repeatCustomersDue = mapData.jobs
    .filter(
      (job) =>
        job.next_service_due_at !== null &&
        job.next_service_due_at.slice(0, 10) <= todayKey,
    )
    .map((job) => jobItem(job, mapData, "Repeat service due"));

  const revenueBookedWeek = mapData.jobs
    .filter((job) => new Date(job.created_at) >= weekStart)
    .reduce((sum, job) => sum + job.revenue, 0);
  const revenueCompletedMonth = mapData.jobs
    .filter((job) => job.completed_at && new Date(job.completed_at) >= monthStart)
    .reduce((sum, job) => sum + job.revenue, 0);
  const newLeadsWeek = mapData.leads.filter(
    (lead) => new Date(lead.created_at) >= weekStart,
  ).length;
  const followUpCompletionRate = mapData.followUps.length
    ? Math.round((completedFollowUps.length / mapData.followUps.length) * 100)
    : 0;

  return {
    activeShifts: activeSessions,
    employeeActivity: employeeActivity(mapData.employees, mapData, sessions, snapshot, nowMs),
    followUpsToday,
    jobsNeedingPhotos,
    jobsToday,
    lockedStreets: activeLocks,
    lowProgressTerritories,
    metrics: {
      bookedJobs: mapData.jobs.filter((job) => job.status === "booked").length,
      followUpCompletionRate,
      newLeadsWeek,
      openQuotes: pendingQuotes.length,
      revenueBookedWeek,
      revenueCompletedMonth,
    },
    overdueFollowUps,
    pendingQuotes,
    recentLeads,
    repeatCustomersDue,
  };
}

function followUpItem(followUp: FollowUpRow, mapData: MapData): PriorityItem {
  const lead = followUp.lead_id
    ? mapData.leads.find((item) => item.id === followUp.lead_id)
    : null;
  const customer = followUp.customer_id
    ? mapData.customers.find((item) => item.id === followUp.customer_id)
    : null;

  return {
    id: followUp.id,
    title: lead?.customer_name ?? customer?.name ?? "Follow-up",
    detail: `${humanize(followUp.reason ?? "follow_up")} · ${followUp.due_at.slice(0, 10)}`,
    entity: lead
      ? { type: "lead", id: lead.id }
      : customer
        ? { type: "customer", id: customer.id }
        : undefined,
  };
}

function leadItem(lead: LeadRow, label: string): PriorityItem {
  return {
    id: lead.id,
    title: lead.customer_name,
    detail: `${label} · ${lead.phone ?? "No phone"} · ${currency.format(lead.quote_amount ?? 0)}`,
    entity: { type: "lead", id: lead.id },
  };
}

function jobItem(job: JobRow, mapData: MapData, label = humanize(job.status)): PriorityItem {
  const customer = job.customer_id
    ? mapData.customers.find((item) => item.id === job.customer_id)
    : null;
  const lead = job.lead_id ? mapData.leads.find((item) => item.id === job.lead_id) : null;

  return {
    id: job.id,
    title: customer?.name ?? lead?.customer_name ?? "Job",
    detail: `${label} · ${job.scheduled_at?.slice(0, 10) ?? "Unscheduled"} · ${currency.format(job.revenue)}`,
    entity: customer
      ? { type: "customer", id: customer.id }
      : lead
        ? { type: "lead", id: lead.id }
        : undefined,
  };
}

function lockItem(lock: StreetLockState, mapData: MapData): PriorityItem {
  const street = mapData.streets.find((item) => item.id === lock.streetId);
  const employee = mapData.employees.find((item) => item.id === lock.employeeId);

  return {
    id: lock.id,
    title: street?.name ?? "Locked street",
    detail: `${employee?.full_name ?? "Employee"} · since ${new Date(lock.lockedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
    entity: street ? { type: "street", id: street.id } : undefined,
  };
}

function sessionItem(session: KnockingSessionRow, mapData: MapData, nowMs: number): PriorityItem {
  const employee = mapData.employees.find((item) => item.id === session.employee_id);
  const territory = session.territory_id
    ? mapData.territories.find((item) => item.id === session.territory_id)
    : null;

  return {
    id: session.id,
    title: employee?.full_name ?? "Active employee",
    detail: `${territory?.name ?? "No territory"} · ${formatDuration(session.started_at, nowMs)}`,
    entity: territory ? { type: "territory", id: territory.id } : undefined,
  };
}

function snapshotShiftItem(
  snapshot: LocalMapSnapshot,
  mapData: MapData,
  nowMs: number,
): PriorityItem {
  const employee = mapData.employees.find((item) => item.id === snapshot.shift?.employeeId);
  const street = mapData.streets.find((item) => item.id === snapshot.activeStreetId);

  return {
    id: "local-active-shift",
    title: employee?.full_name ?? "Demo employee",
    detail: `${street?.name ?? "No active street"} · ${formatDuration(snapshot.shift!.startedAt, nowMs)}`,
    entity: street ? { type: "street", id: street.id } : undefined,
  };
}

function employeeActivity(
  employees: ProfileRow[],
  mapData: MapData,
  sessions: KnockingSessionRow[],
  snapshot: LocalMapSnapshot | null,
  nowMs: number,
) {
  return employees
    .filter((employee) => employee.role === "employee")
    .map((employee) => {
      const activeSession = sessions.find(
        (session) => session.employee_id === employee.id && session.status === "active",
      );
      const isSnapshotEmployee = snapshot?.shift?.employeeId === employee.id && !snapshot.shift.endedAt;
      const currentStreet = isSnapshotEmployee
        ? mapData.streets.find((street) => street.id === snapshot.activeStreetId)?.name
        : "No active street";
      const leadsToday = mapData.leads.filter(
        (lead) => lead.assigned_employee_id === employee.id && lead.created_at.slice(0, 10) === today(),
      ).length;
      const jobsToday = mapData.jobs.filter(
        (job) => job.assigned_employee_id === employee.id && job.created_at.slice(0, 10) === today(),
      ).length;

      return {
        active: Boolean(activeSession || isSnapshotEmployee),
        currentStreet: activeSession
          ? "Cloud session active"
          : currentStreet ?? "No active street",
        duration: activeSession
          ? formatDuration(activeSession.started_at, nowMs)
          : isSnapshotEmployee
            ? formatDuration(snapshot.shift!.startedAt, nowMs)
            : "0:00",
        houses: activeSession?.houses_knocked ?? snapshot?.shift?.housesKnocked ?? 0,
        id: employee.id,
        jobs: activeSession?.jobs_booked ?? jobsToday,
        leads: activeSession?.leads_created ?? leadsToday,
        name: employee.full_name,
      };
    });
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}
