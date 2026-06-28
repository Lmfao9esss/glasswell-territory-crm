"use client";

import { Layers3 } from "lucide-react";

import {
  leadStatusColors,
  streetStatusColors,
  territoryProgressColors,
} from "@/lib/map/colors";

export function MapLegend() {
  return (
    <section className="absolute left-3 right-3 top-[9.25rem] z-[950] mx-auto max-w-md rounded-[24px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-xl shadow-zinc-950/15 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <Layers3 size={18} />
        <h2 className="text-sm font-bold">Map legend</h2>
      </div>
      <LegendGroup
        items={[
          ["Not started", territoryProgressColors.not_started],
          ["Started", territoryProgressColors.started],
          ["Halfway", territoryProgressColors.halfway],
          ["Almost done", territoryProgressColors.almost_done],
          ["Completed", territoryProgressColors.completed],
        ]}
        title="Territories"
      />
      <LegendGroup
        items={[
          ["Not knocked", streetStatusColors.not_knocked],
          ["Currently knocking", streetStatusColors.active],
          ["Completed", streetStatusColors.completed],
          ["Skipped", streetStatusColors.skipped],
          ["Do not knock", streetStatusColors.do_not_knock],
        ]}
        title="Streets"
      />
      <LegendGroup
        items={[
          ["Interested", leadStatusColors.interested],
          ["Quoted", leadStatusColors.quoted],
          ["Waiting", leadStatusColors.waiting],
          ["Booked", leadStatusColors.booked],
          ["Repeat", leadStatusColors.repeat_customer],
          ["No answer", leadStatusColors.no_answer],
          ["Lost", leadStatusColors.lost],
          ["Do not contact", leadStatusColors.do_not_contact],
        ]}
        title="Leads"
      />
    </section>
  );
}

function LegendGroup({
  items,
  title,
}: {
  items: Array<[string, string]>;
  title: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-xs font-bold uppercase text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([label, color]) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700"
            key={`${title}-${label}`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
