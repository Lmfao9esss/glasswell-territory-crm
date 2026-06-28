"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { formatDuration } from "@/lib/map/formatters";
import type { ShiftSession } from "@/lib/map/types";

export function ShiftSummarySheet({
  nowMs,
  onChangeNotes,
  onClose,
  shift,
}: {
  nowMs: number;
  onChangeNotes: (notes: string) => void;
  onClose: () => void;
  shift: ShiftSession;
}) {
  const endedAt = shift.endedAt ?? new Date(nowMs).toISOString();
  const conversion = shift.housesKnocked
    ? Math.round((shift.jobsBooked / shift.housesKnocked) * 100)
    : 0;

  return (
    <BottomSheet eyebrow="Shift Summary" onClose={onClose} title="Work complete">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <MiniMetric
            label="Hours Worked"
            value={formatDuration(shift.startedAt, new Date(endedAt).getTime())}
          />
          <MiniMetric label="Streets" value={`${shift.streetsCompleted}`} />
          <MiniMetric label="Doors" value={`${shift.housesKnocked}`} />
          <MiniMetric label="Leads" value={`${shift.leads}`} />
          <MiniMetric label="Quotes" value={`${shift.quotes}`} />
          <MiniMetric label="Bookings" value={`${shift.jobsBooked}`} />
          <MiniMetric label="Conversion" value={`${conversion}%`} />
          <MiniMetric label="Revenue" value={`$${shift.estimatedRevenue}`} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
            Optional Notes
          </span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold outline-none focus:border-zinc-950"
            placeholder="Anything the manager should know?"
            value={shift.notes}
            onChange={(event) => onChangeNotes(event.target.value)}
          />
        </label>
        <button
          className="h-14 w-full rounded-3xl bg-zinc-950 text-base font-black text-white active:scale-[0.99]"
          type="button"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </BottomSheet>
  );
}

function BottomSheet({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <section className="absolute inset-x-0 bottom-[4.75rem] z-[1200] px-3 pb-3">
      <div className="mx-auto max-w-md rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <p className="text-xs font-bold uppercase text-zinc-500">{eyebrow}</p>
            ) : null}
            <h2 className="text-xl font-black">{title}</h2>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100"
            type="button"
            aria-label="Close sheet"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
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
