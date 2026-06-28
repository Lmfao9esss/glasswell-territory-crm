"use client";

import { Download, RefreshCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useDataSource } from "@/hooks/use-data-source";
import { APP_BUILD_LABEL, APP_VERSION } from "@/lib/app-version";
import {
  clearLocalSnapshot,
  exportLocalSnapshot,
  loadLocalSnapshot,
  parseImportedSnapshot,
  saveLocalSnapshot,
} from "@/lib/map/local-persistence";
import { mockMapData } from "@/lib/map/mock-data";
import { today } from "@/lib/map/formatters";
import type { AuthProfileState, DataMode, LocalMapSnapshot } from "@/lib/map/types";

export function SettingsPanel({ auth }: { auth: AuthProfileState }) {
  const {
    canSwitchDataSource,
    dataMode,
    isEmployee,
    resetDataSourceChoice,
    setDataMode,
  } = useDataSource(auth);
  const [message, setMessage] = useState<string | null>(null);
  const isOwner = auth.profile?.role === "owner";

  function switchDataMode(mode: DataMode) {
    setDataMode(mode);
    setMessage(`Data source set to ${mode === "cloud" ? "Cloud Mode" : "Demo Mode"}.`);
  }

  function exportBackup() {
    const backupJson = exportLocalSnapshot(currentSnapshot());
    const url = `data:application/json;charset=utf-8,${encodeURIComponent(
      backupJson,
    )}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `glasswell-demo-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage("JSON backup exported.");
  }

  async function importBackup(file: File) {
    if (
      !window.confirm(
        "Import this backup over current local demo data? Current demo changes will be replaced.",
      )
    ) {
      return;
    }

    try {
      const snapshot = parseImportedSnapshot(await file.text());
      saveLocalSnapshot(snapshot);
      setMessage("JSON backup imported. Return to the map to load it.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Backup could not be imported.",
      );
    }
  }

  function resetDemoData() {
    if (
      !window.confirm(
        "Reset demo data? This clears all local demo territories, leads, shifts, and activity on this device.",
      )
    ) {
      return;
    }

    clearLocalSnapshot();
    setMessage("Demo data reset. Return to the map to reload starter data.");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-zinc-950/15 backdrop-blur">
        <p className="text-xs font-bold uppercase text-zinc-500">Settings</p>
        <h1 className="mt-1 text-2xl font-black">App Settings</h1>
        <p className="mt-2 text-sm font-semibold text-zinc-600">
          Version {APP_VERSION} - {APP_BUILD_LABEL}
        </p>

        {message ? (
          <p className="mt-4 rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-800">
            {message}
          </p>
        ) : null}

        <section className="mt-5 border-t border-zinc-200 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Data Source</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-600">
                {dataMode === "cloud"
                  ? "Cloud Mode is recommended for real operations."
                  : "Demo Mode uses local data for testing and training."}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              {dataMode === "cloud" ? "Cloud Mode" : "Demo Mode"}
            </span>
          </div>

          {canSwitchDataSource ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className={`h-12 rounded-2xl text-sm font-black ${
                  dataMode === "cloud"
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
                type="button"
                onClick={() => switchDataMode("cloud")}
              >
                Cloud Mode
              </button>
              <button
                className={`h-12 rounded-2xl text-sm font-black ${
                  dataMode === "demo"
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
                type="button"
                onClick={() => switchDataMode("demo")}
              >
                Demo Mode
              </button>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-zinc-100 p-3 text-sm font-bold text-zinc-700">
              {isEmployee
                ? "Cloud Mode is used automatically for employee accounts."
                : "Demo Mode is used automatically until you sign in."}
            </p>
          )}

          {canSwitchDataSource ? (
            <button
              className="mt-3 h-11 w-full rounded-2xl bg-white text-sm font-black text-zinc-700 ring-1 ring-zinc-200 active:scale-[0.99]"
              type="button"
              onClick={() => {
                resetDataSourceChoice();
                setMessage("Data source choice reset to automatic.");
              }}
            >
              Reset to automatic
            </button>
          ) : null}
        </section>

        {isOwner ? (
          <section className="mt-5 border-t border-zinc-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">Developer</h2>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
                Owner Only
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <button
                className="flex h-14 w-full items-center gap-3 rounded-2xl bg-zinc-100 px-4 text-left text-sm font-black text-zinc-950 active:scale-[0.99]"
                type="button"
                onClick={exportBackup}
              >
                <Download size={18} />
                Export Backup (JSON)
              </button>
              <label className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-2xl bg-zinc-100 px-4 text-left text-sm font-black text-zinc-950 active:scale-[0.99]">
                <Upload size={18} />
                Import Backup (JSON)
                <input
                  className="sr-only"
                  type="file"
                  accept="application/json"
                  aria-label="Import JSON backup"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void importBackup(file);
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              <button
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-black text-red-700 active:scale-[0.99]"
                type="button"
                onClick={resetDemoData}
              >
                <RefreshCcw size={18} />
                Reset Demo Data
              </button>
            </div>
          </section>
        ) : null}

        <section className="mt-5 border-t border-zinc-200 pt-5">
          <h2 className="text-lg font-black">Feedback</h2>
          <Link
            className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white"
            href="/feedback"
          >
            Report Issue / Feedback
          </Link>
        </section>
      </div>
    </section>
  );
}

function currentSnapshot(): LocalMapSnapshot {
  const local = loadLocalSnapshot();

  if (local.ok && local.snapshot) {
    return local.snapshot;
  }

  return {
    mapData: mockMapData,
    streetLocks: [],
    activities: [],
    timelineItems: [],
    shift: null,
    activeStreetId: null,
    streetStartedAt: null,
  };
}
