"use client";

import { AlertTriangle, Play } from "lucide-react";

import { formatDuration } from "@/lib/map/formatters";
import type {
  FollowUpRow,
  ProfileRow,
  ShiftSession,
  StreetLockState,
  StreetRow,
  TerritoryRow,
} from "@/lib/map/types";

export function StartShiftPanel({
  employee,
  onStart,
  territory,
}: {
  employee: ProfileRow;
  onStart: () => void;
  territory: TerritoryRow | null;
}) {
  return (
    <section className="absolute inset-x-3 bottom-[5.25rem] z-[1120] mx-auto max-w-md rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Field operations
          </p>
          <h2 className="truncate text-xl font-black">Start Shift</h2>
          <p className="truncate text-sm text-zinc-600">
            {employee.full_name} · {territory?.name ?? "No territory assigned"}
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-zinc-950 text-white">
          <Play size={20} fill="currentColor" />
        </span>
      </div>
      <button
        className="flex h-16 w-full items-center justify-center gap-2 rounded-3xl bg-zinc-950 text-lg font-black text-white active:scale-[0.99]"
        type="button"
        onClick={onStart}
      >
        <Play size={22} fill="currentColor" />
        Start Shift
      </button>
    </section>
  );
}

export function ShiftHud({
  currentStreet,
  employee,
  nowMs,
  onEndShift,
  shift,
}: {
  currentStreet: StreetRow | null;
  employee: ProfileRow;
  nowMs: number;
  onEndShift: () => void;
  shift: ShiftSession;
}) {
  return (
    <section className="absolute left-3 right-[4.5rem] top-[10.25rem] z-[1180] max-w-md rounded-[24px] border border-white/80 bg-white/95 p-3 text-zinc-950 shadow-lg shadow-zinc-950/15 backdrop-blur sm:left-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-zinc-500">
            {employee.full_name}
          </p>
          <h2 className="truncate text-sm font-black">
            Shift Timer {formatDuration(shift.startedAt, nowMs)}
          </h2>
        </div>
        <button
          className="h-10 rounded-full bg-zinc-950 px-4 text-sm font-bold text-white active:scale-95"
          type="button"
          onClick={onEndShift}
        >
          End
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <MiniMetric label="Doors" value={`${shift.housesKnocked}`} />
        <MiniMetric label="Leads" value={`${shift.leads}`} />
        <MiniMetric label="Quotes" value={`${shift.quotes}`} />
        <MiniMetric label="Booked" value={`${shift.jobsBooked}`} />
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-zinc-600">
        Current Street: {currentStreet?.name ?? "Not started"}
      </p>
    </section>
  );
}

export function SmartWarnings({
  activeStreet,
  currentUser,
  followUps,
  locks,
  nowMs,
  shift,
  streets,
  territory,
}: {
  activeStreet: StreetRow | null;
  currentUser: ProfileRow;
  followUps: FollowUpRow[];
  locks: StreetLockState[];
  nowMs: number;
  shift: ShiftSession;
  streets: StreetRow[];
  territory: TerritoryRow | null;
}) {
  const warnings: string[] = [];
  const assignedStreetIds = new Set(
    streets
      .filter((street) => street.territory_id === territory?.id)
      .map((street) => street.id),
  );
  const foreignActiveLock = locks.find(
    (lock) =>
      lock.releasedAt === null &&
      lock.employeeId !== currentUser.id &&
      assignedStreetIds.has(lock.streetId),
  );
  const dueNearby = followUps.some((followUp) => {
    if (!followUp.due_at) return false;
    return (
      followUp.status === "open" &&
      new Date(followUp.due_at).getTime() <= nowMs + 2 * 24 * 60 * 60 * 1000
    );
  });

  if (!shift.startLocation) {
    warnings.push("Location is off. Territory departure warnings are limited.");
  }
  if (activeStreet && activeStreet.territory_id !== territory?.id) {
    warnings.push("You are outside your assigned territory.");
  }
  if (foreignActiveLock) {
    const street = streets.find((item) => item.id === foreignActiveLock.streetId);
    warnings.push(`${street?.name ?? "A nearby street"} is already locked.`);
  }
  if (dueNearby) {
    warnings.push("A nearby follow-up is due soon.");
  }

  if (warnings.length === 0) return null;

  return (
    <section className="absolute left-3 right-3 top-[17.5rem] z-[930] mx-auto max-w-md space-y-2">
      {warnings.slice(0, 2).map((warning) => (
        <div
          className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 shadow-lg shadow-zinc-950/10"
          key={warning}
        >
          <AlertTriangle size={16} />
          <span>{warning}</span>
        </div>
      ))}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-2">
      <p className="truncate text-[10px] font-bold uppercase text-zinc-500">
        {label}
      </p>
      <p className="truncate text-xs font-bold text-zinc-950">{value}</p>
    </div>
  );
}
