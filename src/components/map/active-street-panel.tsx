"use client";

import { Minus, Plus, Square } from "lucide-react";
import type { ReactNode } from "react";

import { formatDuration } from "@/lib/map/formatters";
import type {
  ProfileRow,
  QuickResult,
  StreetLockState,
  StreetRow,
} from "@/lib/map/types";

export function ActiveStreetPanel({
  activeLock,
  employee,
  nowMs,
  onComplete,
  onHouseChange,
  onQuickResult,
  onSkip,
  startedAt,
  street,
}: {
  activeLock: StreetLockState | null;
  employee: ProfileRow | undefined;
  nowMs: number;
  onComplete: () => void;
  onHouseChange: (delta: number) => void;
  onQuickResult: (result: QuickResult) => void;
  onSkip: () => void;
  startedAt: string | null;
  street: StreetRow;
}) {
  const remaining = Math.max(0, street.estimated_houses - street.houses_knocked);
  const progress = Math.round(
    (street.houses_knocked / Math.max(1, street.estimated_houses)) * 100,
  );

  return (
    <section className="absolute inset-x-3 bottom-[9.5rem] z-[1140] mx-auto max-w-md rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-zinc-500">Active street</p>
          <h2 className="truncate text-xl font-black">{street.name}</h2>
          <p className="truncate text-sm font-semibold text-zinc-600">
            {startedAt ? formatDuration(startedAt, nowMs) : "0:00"} ·{" "}
            {activeLock ? `Locked by ${employee?.full_name ?? "you"}` : "Available"}
          </p>
        </div>
        <button
          className="h-11 rounded-full bg-zinc-100 px-4 text-sm font-bold active:scale-95"
          type="button"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <MiniMetric label="Estimated" value={`${street.estimated_houses}`} />
        <MiniMetric label="Knocked" value={`${street.houses_knocked}`} />
        <MiniMetric label="Remaining" value={`${remaining}`} />
      </div>
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs font-bold text-zinc-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-zinc-200">
          <div
            className="h-3 rounded-full bg-emerald-600"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
      {street.notes ? (
        <p className="mb-4 rounded-2xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-700">
          {street.notes}
        </p>
      ) : null}
      <div className="mb-4 grid grid-cols-[1fr_1.4fr_1fr] gap-2">
        <CounterButton ariaLabel="Remove house" onClick={() => onHouseChange(-1)}>
          <Minus size={28} />
        </CounterButton>
        <div className="rounded-3xl bg-zinc-950 px-3 py-4 text-center text-white">
          <p className="text-xs font-bold uppercase text-white/65">House Counter</p>
          <p className="text-4xl font-black">{street.houses_knocked}</p>
        </div>
        <CounterButton ariaLabel="Add house" onClick={() => onHouseChange(1)}>
          <Plus size={30} />
        </CounterButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultButton label="No Answer" onClick={() => onQuickResult("no_answer")} />
        <ResultButton label="Interested" onClick={() => onQuickResult("interested")} />
        <ResultButton label="Quote Given" onClick={() => onQuickResult("quoted")} />
        <ResultButton label="Booked" onClick={() => onQuickResult("booked")} />
        <ResultButton label="Call Back" onClick={() => onQuickResult("call_back")} />
        <ResultButton
          label="Do Not Contact"
          onClick={() => onQuickResult("do_not_contact")}
        />
      </div>
      <button
        className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-emerald-700 text-base font-black text-white active:scale-[0.99]"
        type="button"
        onClick={onComplete}
      >
        <Square size={18} fill="currentColor" />
        Complete Street
      </button>
    </section>
  );
}

function CounterButton({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="grid min-h-24 place-items-center rounded-3xl bg-zinc-100 text-zinc-950 active:scale-[0.98]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ResultButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-14 rounded-2xl bg-zinc-100 px-3 text-sm font-black text-zinc-950 active:scale-[0.99]"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
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
