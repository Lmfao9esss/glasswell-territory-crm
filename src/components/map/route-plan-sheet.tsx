"use client";

import { humanize } from "@/lib/map/formatters";
import { formatDistance, type RoutePlan, type RouteStep } from "@/lib/map/route-planning";
import type { StreetRow } from "@/lib/map/types";
import { Metric, SheetHeader } from "@/components/map/sheet-primitives";

export function RoutePlanSheet({
  onClose,
  onOpenRelated,
  onOpenStreet,
  onRefresh,
  onSkipStreet,
  onStartStreet,
  plan,
}: {
  onClose: () => void;
  onOpenRelated: (entity: RouteStep["relatedEntities"][number]) => void;
  onOpenStreet: (street: StreetRow) => void;
  onRefresh: () => void;
  onSkipStreet: (street: StreetRow) => void;
  onStartStreet: (street: StreetRow) => void;
  plan: RoutePlan;
}) {
  const nextStep = plan.steps[0] ?? null;

  return (
    <section className="absolute inset-x-0 bottom-[4.75rem] top-[10.25rem] z-[1320] px-3 pb-3 sm:px-5">
      <div className="mx-auto flex max-h-full max-w-md flex-col rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
        <SheetHeader
          eyebrow="Route"
          onClose={onClose}
          title="Walking Route"
          subtitle={plan.territory.name}
        />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {nextStep ? (
            <div className="mb-3 rounded-3xl bg-violet-50 p-3 text-violet-950">
              <p className="text-xs font-bold uppercase text-violet-700">
                Next recommended street
              </p>
              <h3 className="mt-1 text-xl font-black">{nextStep.street.name}</h3>
              <p className="mt-1 text-sm font-semibold">
                {formatDistance(nextStep.distanceMeters)} -{" "}
                {nextStep.reasons[0] ?? "Best available street"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="h-12 rounded-2xl bg-violet-700 px-3 text-sm font-black text-white active:scale-[0.98]"
                  type="button"
                  onClick={() => onStartStreet(nextStep.street)}
                >
                  Start next street
                </button>
                <button
                  className="h-12 rounded-2xl bg-white px-3 text-sm font-black text-violet-950 active:scale-[0.98]"
                  type="button"
                  onClick={() => onOpenStreet(nextStep.street)}
                >
                  Open street
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-3 rounded-3xl bg-zinc-100 p-4 text-sm font-semibold text-zinc-500">
              No unfinished available streets are ready for routing.
            </p>
          )}

          <div className="mb-3 grid grid-cols-3 gap-2">
            <Metric label="Stops" value={`${plan.steps.length}`} />
            <Metric
              label="Next"
              value={nextStep ? formatDistance(nextStep.distanceMeters) : "None"}
            />
            <Metric label="Updated" value={plan.generatedAt.slice(11, 16)} />
          </div>

          <button
            className="mb-3 h-11 w-full rounded-2xl bg-zinc-950 text-sm font-black text-white active:scale-[0.98]"
            type="button"
            onClick={onRefresh}
          >
            Refresh route
          </button>

          <div className="space-y-2">
            {plan.steps.map((step, index) => (
              <RouteStepCard
                key={step.street.id}
                onOpenRelated={onOpenRelated}
                onOpenStreet={onOpenStreet}
                onSkipStreet={onSkipStreet}
                onStartStreet={onStartStreet}
                step={step}
                stopNumber={index + 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteStepCard({
  onOpenRelated,
  onOpenStreet,
  onSkipStreet,
  onStartStreet,
  step,
  stopNumber,
}: {
  onOpenRelated: (entity: RouteStep["relatedEntities"][number]) => void;
  onOpenStreet: (street: StreetRow) => void;
  onSkipStreet: (street: StreetRow) => void;
  onStartStreet: (street: StreetRow) => void;
  step: RouteStep;
  stopNumber: number;
}) {
  const related = step.relatedEntities[0] ?? null;

  return (
    <article className="rounded-3xl bg-zinc-100 p-3">
      <button
        className="flex w-full items-start gap-3 text-left"
        type="button"
        onClick={() => onOpenStreet(step.street)}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-950 text-sm font-black text-white">
          {stopNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-black">
            {step.street.name}
          </span>
          <span className="block text-xs font-semibold text-zinc-500">
            {formatDistance(step.distanceMeters)} - Score {step.score}
          </span>
        </span>
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {step.reasons.map((reason) => (
          <span
            className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-700"
            key={reason}
          >
            {reason}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="h-11 rounded-2xl bg-zinc-950 text-sm font-black text-white active:scale-[0.98]"
          type="button"
          onClick={() => onStartStreet(step.street)}
        >
          Start
        </button>
        <button
          className="h-11 rounded-2xl bg-white text-sm font-black text-zinc-950 active:scale-[0.98]"
          type="button"
          onClick={() => onSkipStreet(step.street)}
        >
          Skip
        </button>
      </div>
      {related ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className="h-11 rounded-2xl bg-white text-sm font-black text-zinc-950 active:scale-[0.98]"
            type="button"
            onClick={() => onOpenRelated(related)}
          >
            Open follow-up
          </button>
          <button
            className="h-11 rounded-2xl bg-white text-sm font-black text-zinc-950 active:scale-[0.98]"
            type="button"
            onClick={() => onOpenRelated(related)}
          >
            Open {humanize(related.type)}
          </button>
        </div>
      ) : null}
    </article>
  );
}
