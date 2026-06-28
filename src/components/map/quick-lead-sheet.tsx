"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { quickResultLabel } from "@/lib/map/status-labels";
import type { QuickLeadDraft } from "@/lib/map/types";

export function QuickLeadSheet({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: QuickLeadDraft;
  onChange: (draft: QuickLeadDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet eyebrow="Quick Lead Mode" onClose={onClose} title="Save lead">
      <div className="space-y-3">
        <p className="rounded-2xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-700">
          Result: {quickResultLabel(draft.result)}
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
            Phone
          </span>
          <input
            className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
            inputMode="tel"
            placeholder="613-555-0198"
            value={draft.phone}
            onChange={(event) => onChange({ ...draft, phone: event.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
              Name
            </span>
            <input
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
              placeholder="Optional"
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
              Quote
            </span>
            <input
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base font-bold outline-none focus:border-zinc-950"
              inputMode="decimal"
              placeholder="$"
              value={draft.quote}
              onChange={(event) => onChange({ ...draft, quote: event.target.value })}
            />
          </label>
        </div>
        <textarea
          className="min-h-20 w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold outline-none focus:border-zinc-950"
          placeholder="Notes"
          value={draft.notes}
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
        <button
          className="h-14 w-full rounded-3xl bg-zinc-950 text-base font-black text-white active:scale-[0.99]"
          type="button"
          onClick={onSave}
        >
          Save Lead
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
