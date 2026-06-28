import Link from "next/link";

import {
  BetaReadinessPanel,
  type BetaReadinessCheck,
} from "@/components/admin/beta-readiness-panel";
import { loadAuthProfile } from "@/lib/auth/profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function BetaReadinessPage() {
  const auth = await loadAuthProfile();
  const checks = await loadBetaReadinessChecks();

  return (
    <main className="min-h-dvh bg-[#d7e3dc] px-4 py-6 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-bold text-zinc-600" href="/">
          Back to map
        </Link>
        <div className="mt-4 rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-2xl shadow-zinc-950/15 backdrop-blur">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Beta release prep
          </p>
          <h1 className="mt-1 text-2xl font-black">Beta readiness</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600">
            Checks the minimum setup needed before testing with the owner and 1-2
            employees.
          </p>
          {!auth.profile ||
          !["owner", "manager"].includes(auth.profile.role) ? (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-950">
              Owner or manager login is recommended before using this checklist.
            </p>
          ) : null}
          <BetaReadinessPanel initialChecks={checks} />
        </div>
      </div>
    </main>
  );
}

async function loadBetaReadinessChecks(): Promise<BetaReadinessCheck[]> {
  const auth = await loadAuthProfile();
  const supabase = await getSupabaseServerClient();
  const isConfigured = Boolean(supabase);
  const hasAuth = auth.isConfigured;
  const hasOwner = auth.profile?.role === "owner";
  const hasOrganization = Boolean(auth.organization);

  let territoryCount = 0;
  let employeeCount = 0;

  if (supabase && auth.organization?.id) {
    const [{ count: territories }, { count: employees }] = await Promise.all([
      supabase
        .from("territories")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", auth.organization.id),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", auth.organization.id)
        .eq("role", "employee"),
    ]);
    territoryCount = territories ?? 0;
    employeeCount = employees ?? 0;
  }

  return [
    {
      label: "Supabase env configured",
      passed: isConfigured,
      detail: isConfigured
        ? "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are available."
        : "Supabase env keys are missing. Demo Mode still works.",
    },
    {
      label: "Auth available",
      passed: hasAuth,
      detail: hasAuth
        ? "Supabase auth client can be initialized."
        : "Auth is unavailable until Supabase env keys are configured.",
    },
    {
      label: "Owner profile exists",
      passed: hasOwner,
      detail: hasOwner
        ? `Owner profile loaded for ${auth.profile?.email}.`
        : "Login as the owner after creating the first owner profile.",
    },
    {
      label: "Organization exists",
      passed: hasOrganization,
      detail: hasOrganization
        ? `${auth.organization?.name} is linked to this session.`
        : "Create or join an organization before Cloud Mode beta.",
    },
    {
      label: "At least one territory exists",
      passed: territoryCount > 0,
      detail:
        territoryCount > 0
          ? `${territoryCount} cloud territories found.`
          : "Create a territory and import streets in Cloud Mode.",
    },
    {
      label: "At least one employee exists",
      passed: employeeCount > 0,
      detail:
        employeeCount > 0
          ? `${employeeCount} employee profiles found.`
          : "Add at least one employee profile.",
    },
    {
      label: "RLS smoke test available",
      passed: true,
      detail: "/admin/cloud-test is available for owner RLS verification.",
    },
  ];
}
