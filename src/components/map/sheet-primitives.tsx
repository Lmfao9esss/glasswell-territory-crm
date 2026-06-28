"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function SheetHeader({
  eyebrow,
  icon,
  onClose,
  subtitle,
  title,
}: {
  eyebrow: string;
  icon?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-zinc-500">
          {icon}
          {eyebrow}
        </p>
        <h2 className="truncate text-xl font-bold">{title}</h2>
        {subtitle ? (
          <p className="truncate text-sm text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      <button
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95"
        type="button"
        aria-label="Close details"
        onClick={onClose}
      >
        <X size={19} />
      </button>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-100 p-3">
      <p className="truncate text-[11px] font-bold uppercase text-zinc-500">
        {label}
      </p>
      <p className="truncate text-sm font-bold text-zinc-950">{value}</p>
    </div>
  );
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-2">
      <p className="truncate text-[10px] font-bold uppercase text-zinc-500">
        {label}
      </p>
      <p className="truncate text-xs font-bold text-zinc-950">{value}</p>
    </div>
  );
}
