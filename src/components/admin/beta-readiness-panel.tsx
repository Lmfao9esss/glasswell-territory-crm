"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { APP_BUILD_LABEL, APP_VERSION } from "@/lib/app-version";
import { exportLocalSnapshot, parseImportedSnapshot } from "@/lib/map/local-persistence";
import { mockMapData } from "@/lib/map/mock-data";
import type { LocalMapSnapshot } from "@/lib/map/types";

export type BetaReadinessCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export function BetaReadinessPanel({
  initialChecks,
}: {
  initialChecks: BetaReadinessCheck[];
}) {
  const [browserChecks, setBrowserChecks] = useState<BetaReadinessCheck[]>([
    {
      label: "PWA manifest available",
      passed: false,
      detail: "Checking browser fetch.",
    },
    {
      label: "Service worker registered",
      passed: false,
      detail: "Checking browser registration.",
    },
    {
      label: "Demo backup/export works",
      passed: false,
      detail: "Checking local backup parser.",
    },
  ]);

  useEffect(() => {
    let active = true;

    async function runBrowserChecks() {
      const manifest = await fetch("/manifest.json")
        .then((response) => response.ok)
        .catch(() => false);
      const serviceWorker =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker
              .getRegistration()
              .then((registration) => Boolean(registration))
              .catch(() => false)
          : false;
      const backup = checkDemoBackup();

      if (!active) return;
      setBrowserChecks([
        {
          label: "PWA manifest available",
          passed: manifest,
          detail: manifest
            ? "Manifest loaded from /manifest.json."
            : "Manifest could not be fetched.",
        },
        {
          label: "Service worker registered",
          passed: serviceWorker,
          detail: serviceWorker
            ? "A service worker registration exists."
            : "No service worker registration detected in this browser session.",
        },
        {
          label: "Demo backup/export works",
          passed: backup,
          detail: backup
            ? "Demo snapshot exported and parsed."
            : "Demo backup export/parser failed.",
        },
      ]);
    }

    void runBrowserChecks();
    return () => {
      active = false;
    };
  }, []);

  const checks = useMemo(
    () => [...initialChecks, ...browserChecks],
    [browserChecks, initialChecks],
  );
  const passedCount = checks.filter((check) => check.passed).length;
  const ready = passedCount === checks.length;

  const grouped = useMemo(
    () => ({
      passed: checks.filter((check) => check.passed),
      failed: checks.filter((check) => !check.passed),
    }),
    [checks],
  );

  return (
    <div className="mt-5 space-y-4">
      <div
        className={`rounded-3xl p-4 ${
          ready ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"
        }`}
      >
        <p className="text-sm font-black">
          {passedCount}/{checks.length} beta checks passing
        </p>
        <p className="mt-1 text-sm font-semibold">
          {ready
            ? "Ready for a small owner/employee beta."
            : "Finish failed checks before relying on Cloud Mode in the field."}
        </p>
        <p className="mt-2 text-xs font-bold uppercase opacity-70">
          App {APP_VERSION} - {APP_BUILD_LABEL}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-black">Failed checks</h2>
        <CheckList checks={grouped.failed} empty="No failed checks." />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-black">Passing checks</h2>
        <CheckList checks={grouped.passed} empty="No passing checks yet." />
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          className="flex h-12 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white"
          href="/admin/cloud-test"
        >
          Cloud test
        </Link>
        <Link
          className="flex h-12 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-black text-zinc-950"
          href="/admin/employees"
        >
          Employees
        </Link>
        <Link
          className="flex h-12 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-black text-zinc-950"
          href="/feedback"
        >
          Feedback
        </Link>
      </div>
    </div>
  );
}

function CheckList({
  checks,
  empty,
}: {
  checks: BetaReadinessCheck[];
  empty: string;
}) {
  if (!checks.length) {
    return (
      <p className="rounded-2xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-500">
        {empty}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {checks.map((check) => (
        <div
          className="rounded-2xl bg-zinc-100 p-3"
          key={check.label}
          data-testid={`beta-check-${check.label}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black">{check.label}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                check.passed
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {check.passed ? "Pass" : "Fail"}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-600">
            {check.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function checkDemoBackup() {
  try {
    const snapshot: LocalMapSnapshot = {
      mapData: mockMapData,
      streetLocks: [],
      activities: [],
      timelineItems: [],
      shift: null,
      activeStreetId: null,
      streetStartedAt: null,
    };
    return Boolean(parseImportedSnapshot(exportLocalSnapshot(snapshot)).mapData);
  } catch {
    return false;
  }
}
