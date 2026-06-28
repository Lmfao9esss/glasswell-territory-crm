"use client";

import { useState } from "react";

import { APP_BUILD_LABEL, APP_VERSION } from "@/lib/app-version";
import {
  loadLocalFeedback,
  submitFeedback,
  type FeedbackDraft,
} from "@/lib/feedback";
import type { AuthProfileState, DataMode } from "@/lib/map/types";

const initialDraft: FeedbackDraft = {
  type: "bug",
  area: "Map",
  description: "",
  screenshotNote: "",
};

export function FeedbackPanel({ auth }: { auth: AuthProfileState }) {
  const [dataMode, setDataMode] = useState<DataMode>("demo");
  const [draft, setDraft] = useState<FeedbackDraft>(initialDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localCount, setLocalCount] = useState(() => loadLocalFeedback().length);

  async function handleSubmit() {
    if (!draft.area.trim()) {
      setMessage("Add the page or area where this happened.");
      return;
    }
    if (!draft.description.trim()) {
      setMessage("Add a short description before submitting.");
      return;
    }

    setIsSaving(true);
    const result = await submitFeedback({ auth, dataMode, draft });
    setIsSaving(false);
    setMessage(result.message);
    setLocalCount(loadLocalFeedback().length);

    if (result.ok) {
      setDraft(initialDraft);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-zinc-950/15 backdrop-blur">
        <p className="text-xs font-bold uppercase text-zinc-500">More</p>
        <h1 className="mt-1 text-2xl font-black">Report Issue / Feedback</h1>
        <p className="mt-2 text-sm font-semibold text-zinc-600">
          App version {APP_VERSION} - {APP_BUILD_LABEL}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["demo", "cloud"] as DataMode[]).map((mode) => (
            <button
              className={`h-12 rounded-2xl text-sm font-black ${
                dataMode === mode
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-700"
              }`}
              key={mode}
              type="button"
              onClick={() => setDataMode(mode)}
            >
              {mode === "demo" ? "Demo Mode" : "Cloud Mode"}
            </button>
          ))}
        </div>

        {dataMode === "cloud" && !auth.isConfigured ? (
          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950">
            Supabase is not configured. Demo Mode is available.
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-800">
            {message}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
              Type
            </span>
            <select
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
              value={draft.type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as FeedbackDraft["type"],
                }))
              }
            >
              <option value="bug">Bug</option>
              <option value="idea">Idea</option>
              <option value="confusing">Confusing</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
              Page / area
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold outline-none focus:border-zinc-950"
              value={draft.area}
              onChange={(event) =>
                setDraft((current) => ({ ...current, area: event.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
              Description
            </span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base font-semibold outline-none focus:border-zinc-950"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
              Screenshot note
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold outline-none focus:border-zinc-950"
              placeholder="Optional: describe screenshot or where it is saved"
              value={draft.screenshotNote}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  screenshotNote: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <button
          className="mt-4 h-14 w-full rounded-2xl bg-zinc-950 text-base font-black text-white active:scale-[0.98] disabled:opacity-60"
          type="button"
          disabled={isSaving}
          onClick={handleSubmit}
        >
          {isSaving ? "Submitting" : "Submit feedback"}
        </button>
      </div>

      <div className="rounded-[24px] bg-white/80 p-4 text-sm font-semibold text-zinc-600">
        Local feedback saved on this device: {localCount}
      </div>
    </section>
  );
}
