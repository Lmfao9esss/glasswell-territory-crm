"use client";

import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type { AuthProfileState, LeadStatus } from "@/lib/map/types";
import type { Database } from "@/lib/db/database.types";

type TestStatus = "idle" | "pass" | "fail";

type TestResult = {
  label: string;
  status: TestStatus;
  detail: string;
};

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
type DebugContext = {
  operation: string;
  table: "leads";
  payload: LeadInsert | LeadUpdate | null;
  leadId?: string;
  createdLeadStatus?: string;
  createdLeadJobStatus?: string;
};

const CLOUD_TEST_UPDATE_LEAD_STATUS = "waiting" satisfies LeadStatus;
const CLOUD_TEST_ARCHIVE_LEAD_STATUS = "lost" satisfies LeadStatus;

const initialResults: TestResult[] = [
  { label: "Current auth user", status: "idle", detail: "Not run" },
  { label: "Profile loaded", status: "idle", detail: "Not run" },
  { label: "Organization loaded", status: "idle", detail: "Not run" },
  { label: "Read territories", status: "idle", detail: "Not run" },
  { label: "Read streets", status: "idle", detail: "Not run" },
  { label: "Create test lead", status: "idle", detail: "Not run" },
  { label: "Update test lead", status: "idle", detail: "Not run" },
  { label: "Archive test lead", status: "idle", detail: "Not run" },
];

export function CloudTestPanel({ auth }: { auth: AuthProfileState }) {
  const [results, setResults] = useState<TestResult[]>(initialResults);
  const [isRunning, setIsRunning] = useState(false);
  const [debugPayload, setDebugPayload] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  function setResult(label: string, status: TestStatus, detail: string) {
    setResults((current) =>
      current.map((result) =>
        result.label === label ? { ...result, status, detail } : result,
      ),
    );
  }

  async function runTests() {
    const supabase = getSupabaseBrowserClient();
    let debugContext: DebugContext = {
      operation: "Not started",
      table: "leads",
      payload: null,
    };

    setResults(initialResults);
    setDebugPayload(null);
    setDebugError(null);

    if (!supabase || !auth.profile || !auth.organization) {
      setResult(
        "Current auth user",
        "fail",
        "Supabase, profile, or organization is missing.",
      );
      return;
    }

    setIsRunning(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error("No auth user.");
      setResult("Current auth user", "pass", user.email ?? user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError || !profile) throw profileError ?? new Error("No profile.");
      setResult("Profile loaded", "pass", auth.profile.role);

      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", auth.organization.id)
        .single();
      if (organizationError || !organization) {
        throw organizationError ?? new Error("No organization.");
      }
      setResult("Organization loaded", "pass", auth.organization.name);

      const { data: territories, error: territoriesError } = await supabase
        .from("territories")
        .select("*")
        .limit(10);
      if (territoriesError) throw territoriesError;
      setResult("Read territories", "pass", `${territories?.length ?? 0} rows`);

      const { data: streets, error: streetsError } = await supabase
        .from("streets")
        .select("*")
        .limit(10);
      if (streetsError) throw streetsError;
      setResult("Read streets", "pass", `${streets?.length ?? 0} rows`);

      const territory = territories?.[0] as
        | Database["public"]["Tables"]["territories"]["Row"]
        | undefined;
      const street = streets?.[0] as
        | Database["public"]["Tables"]["streets"]["Row"]
        | undefined;
      const leadInsert: LeadInsert = {
        organization_id: auth.organization.id,
        territory_id: territory?.id ?? null,
        street_id: street?.id ?? null,
        assigned_employee_id: auth.profile.id,
        customer_name: `Cloud Test ${Date.now()}`,
        phone: "613-555-0199",
        address: "Cloud smoke test lead",
        status: "interested",
        job_status: "draft",
        lead_source: "cloud_smoke_test",
        notes: "Created by /admin/cloud-test.",
        created_by: auth.profile.id,
        updated_by: auth.profile.id,
      };

      debugContext = {
        operation: "Create test lead",
        table: "leads",
        payload: leadInsert,
      };
      const { data: lead, error: createError } = await supabase
        .from("leads")
        .insert(leadInsert as never)
        .select("*")
        .single();
      if (createError || !lead) throw createError ?? new Error("Lead not created.");
      const createdLead = lead as Database["public"]["Tables"]["leads"]["Row"];
      setResult("Create test lead", "pass", createdLead.customer_name);

      const leadUpdate: LeadUpdate = {
        notes: "Updated by /admin/cloud-test.",
        status: CLOUD_TEST_UPDATE_LEAD_STATUS,
        updated_by: auth.profile.id,
      };
      debugContext = {
        operation: "Update test lead",
        table: "leads",
        payload: leadUpdate,
        leadId: createdLead.id,
        createdLeadStatus: createdLead.status,
        createdLeadJobStatus: createdLead.job_status,
      };
      await displayDevelopmentPayload("Update test lead", leadUpdate, setDebugPayload);
      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update(leadUpdate as never)
        .eq("organization_id", auth.organization.id)
        .eq("id", createdLead.id)
        .select("id, notes, status")
        .single();
      if (updateError) throw updateError;
      if (!updatedLead) {
        throw new Error("Lead update returned no row. Check lead update RLS.");
      }
      setResult("Update test lead", "pass", "Updated status to waiting.");

      const leadArchive: LeadUpdate = {
        status: CLOUD_TEST_ARCHIVE_LEAD_STATUS,
        job_status: "lost",
        notes: "Archived by /admin/cloud-test.",
        updated_by: auth.profile.id,
      };
      debugContext = {
        operation: "Archive test lead",
        table: "leads",
        payload: leadArchive,
        leadId: createdLead.id,
        createdLeadStatus: createdLead.status,
        createdLeadJobStatus: createdLead.job_status,
      };
      await displayDevelopmentPayload("Archive test lead", leadArchive, setDebugPayload);
      const { data: archivedLead, error: archiveError } = await supabase
        .from("leads")
        .update(leadArchive as never)
        .eq("organization_id", auth.organization.id)
        .eq("id", createdLead.id)
        .select("id, status, job_status")
        .single();
      if (archiveError) throw archiveError;
      if (!archivedLead) {
        throw new Error("Lead archive returned no row. Check lead update RLS.");
      }
      setResult("Archive test lead", "pass", "Marked lost instead of deleting.");
    } catch (error) {
      const message = formatSupabaseError(error);
      setDebugError(
        JSON.stringify(
          {
            context: debugContext,
            formatted: message,
            raw: serializeError(error),
          },
          null,
          2,
        ),
      );
      setResults((current) => {
        const firstIdle = current.find((result) => result.status === "idle");
        if (!firstIdle) return current;
        return current.map((result) =>
          result.label === firstIdle.label
            ? { ...result, status: "fail", detail: message }
            : result,
        );
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        className="h-12 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white disabled:opacity-50"
        type="button"
        disabled={isRunning}
        onClick={runTests}
      >
        {isRunning ? "Running" : "Run Cloud Test"}
      </button>
      {process.env.NODE_ENV !== "production" && debugPayload ? (
        <div className="mt-4 rounded-2xl bg-zinc-950 p-3 text-xs font-semibold text-white">
          <p className="font-black">Development payload preview</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
            {debugPayload}
          </pre>
        </div>
      ) : null}
      {process.env.NODE_ENV !== "production" && debugError ? (
        <div className="mt-4 rounded-2xl bg-red-950 p-3 text-xs font-semibold text-white">
          <p className="font-black">Development error detail</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
            {debugError}
          </pre>
        </div>
      ) : null}
      <div className="mt-4 space-y-2">
        {results.map((result) => (
          <div
            className="flex items-start justify-between gap-3 rounded-2xl bg-zinc-100 p-3"
            key={result.label}
          >
            <div>
              <p className="text-sm font-black">{result.label}</p>
              <p className="text-xs font-semibold text-zinc-600">{result.detail}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                result.status === "pass"
                  ? "bg-emerald-100 text-emerald-800"
                  : result.status === "fail"
                    ? "bg-red-100 text-red-700"
                    : "bg-white text-zinc-500"
              }`}
            >
              {result.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return error;
  }

  return { value: error };
}

async function displayDevelopmentPayload(
  label: string,
  payload: LeadUpdate,
  setDebugPayload: (payload: string) => void,
) {
  if (process.env.NODE_ENV === "production") return;

  setDebugPayload(`${label}\n${JSON.stringify(payload, null, 2)}`);
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}
